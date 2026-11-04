"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

export type DotTidePattern = "rings" | "fibonacci" | "grid";

export interface DotTideProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The wave follows it: ring by ring, row by row, or along the spiral. */
  pattern?: DotTidePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** How far the wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** How many rows the wave pulls in at once. */
  width?: number;
  /** Seconds for the wave to travel from one pole to the other. */
  duration?: number;
  /** Seconds the orb rests after the wave leaves, before the next one. */
  gap?: number;
  /** Which end of the orb the wave starts from. */
  from?: "top" | "bottom";
  /** Tilt toward the viewer in degrees, so the top of the orb shows. */
  tilt?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of the dots furthest away (0–1). Front dots are always 1. */
  backOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

/** Back dots are drawn at this fraction of `dotSize`. */
const BACK_SCALE = 0.35;
/** Opacity a dot keeps at the deepest point of the wave, so sunken dots read as further inside. */
const SUNK_OPACITY = 0.55;

/** Seconds (roughly) a changed prop takes to glide to its new value. */
const SETTLE = 0.16;
/** Seconds (roughly) pausing takes to coast to a stop, and resuming to get back up to speed. */
const PAUSE_SETTLE = 0.3;

/** A value that glides toward its target on a critically damped spring: no jump, no overshoot. */
type Glide = { value: number; velocity: number; target: number };

function glide(value: number): Glide {
  return { value, velocity: 0, target: value };
}

function glideAll<K extends string>(targets: Record<K, number>) {
  return Object.fromEntries(Object.entries<number>(targets).map(([k, v]) => [k, glide(v)])) as Record<K, Glide>;
}

function retarget<K extends string>(glides: Record<K, Glide>, targets: Record<K, number>) {
  for (const k in targets) glides[k].target = targets[k];
}

function snapAll(glides: Record<string, Glide>) {
  for (const g of Object.values(glides)) {
    g.value = g.target;
    g.velocity = 0;
  }
}

/** Moves `g` toward its target. Returns false once it has arrived and is at rest. */
function stepGlide(g: Glide, dt: number, time: number) {
  if (g.value === g.target && g.velocity === 0) return false;
  const omega = 2 / time;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = g.value - g.target;
  const temp = (g.velocity + omega * change) * dt;
  g.velocity = (g.velocity - omega * temp) * decay;
  g.value = g.target + (change + temp) * decay;
  if (Math.abs(g.value - g.target) < 1e-3 && Math.abs(g.velocity) < 1e-3) {
    g.value = g.target;
    g.velocity = 0;
  }
  return true;
}

let probe: CanvasRenderingContext2D | null = null;

/** Resolves any CSS color to sRGB [r, g, b, a] by painting it into one pixel, so it can be blended. */
function parseColor(color: string): [number, number, number, number] {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return [228, 228, 231, 1];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000"; // An invalid color leaves fillStyle as it was, so start from a known one.
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** A point on the unit sphere and where it sits from pole to pole (`along`, 0 = top). */
type Point = { x: number; y: number; z: number; along: number };

function buildPoints(pattern: DotTidePattern, density: number) {
  const rows = Math.max(3, Math.round(density));
  const points: Point[] = [];

  if (pattern === "fibonacci") {
    // The spiral has no rows, so the wave follows the spiral's own order, dot by dot.
    const count = Math.round(rows * rows * 1.25);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - ((i + 0.5) / count) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * golden;
      points.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, along: i / (count - 1) });
    }
    return { points, rows };
  }

  // Rings and grid share latitude rows; each row rides the wave as one. Poles get a single dot each.
  points.push({ x: 0, y: 1, z: 0, along: 0 }, { x: 0, y: -1, z: 0, along: 1 });
  const cols = rows * 2;
  for (let i = 1; i < rows; i++) {
    const lat = Math.PI / 2 - (i / rows) * Math.PI;
    const y = Math.sin(lat);
    const r = Math.cos(lat);
    // Rings keep even spacing along each row; grid keeps meridians aligned.
    const n = pattern === "grid" ? cols : Math.max(1, Math.round(cols * r));
    const offset = pattern === "grid" ? 0 : (i % 2) * (Math.PI / n);
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2 + offset;
      points.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, along: i / rows });
    }
  }
  return { points, rows };
}

type Settings = Required<
  Pick<
    DotTideProps,
    "pattern" | "dotSize" | "density" | "size" | "depth" | "width" | "duration" | "gap" | "from" | "tilt" | "color" | "backOpacity" | "paused"
  >
>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  const [red, green, blue, alpha] = parseColor(s.color);
  return {
    dotSize: s.dotSize,
    size: s.size,
    depth: s.depth,
    width: s.width,
    duration: s.duration,
    gap: s.gap,
    // 0 runs the wave top to bottom, 1 bottom to top; gliding between them turns the tide smoothly.
    from: s.from === "bottom" ? 1 : 0,
    tilt: s.tilt,
    backOpacity: s.backOpacity,
    red,
    green,
    blue,
    alpha,
    rate: s.paused ? 0 : 1,
  };
}

function buildShape(pattern: DotTidePattern, density: number) {
  const { points, rows } = buildPoints(pattern, density);
  return {
    key: `${pattern}:${rows}`,
    points,
    rows,
    projected: points.map(() => ({ x: 0, y: 0, z: 0, w: 0 })),
    order: points.map((_, i) => i),
    fade: glide(1),
  };
}

export function DotTide({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  depth = 0.2,
  width = 3.5,
  duration = 1.6,
  gap = 0.4,
  from = "top",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  className,
  style,
  ...rest
}: DotTideProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only the first size reaches the DOM through React; after that the loop glides it.
  const [initialSize] = useState(size);
  const settings: Settings = { pattern, dotSize, density, size, depth, width, duration, gap, from, tilt, color, backOpacity, paused };
  const settingsRef = useRef(settings);
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    wakeRef.current?.();
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrapper || !canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const g = glideAll(targetsOf(settingsRef.current));
    // A pattern or density change cross-fades the old orb out while the new one fades in.
    let shapes = [buildShape(settingsRef.current.pattern, settingsRef.current.density)];
    // Position within the current sweep (0–1), advanced by rate so pausing coasts to a stop.
    let phase = 0;
    let shownSize = -1;
    let frame = 0;
    let last = 0;

    const sync = () => {
      const s = settingsRef.current;
      retarget(g, targetsOf(s));
      const next = buildShape(s.pattern, s.density);
      if (next.key !== shapes[shapes.length - 1].key) {
        for (const shape of shapes) shape.fade.target = 0;
        next.fade = glide(0);
        next.fade.target = 1;
        shapes.push(next);
      }
      // Reduced motion: hold still and apply changes at once.
      if (reduceMotion.matches) {
        g.rate.target = 0;
        snapAll(g);
        for (const shape of shapes) snapAll({ fade: shape.fade });
      }
    };

    const cycleOf = () => Math.max(0.05, g.duration.value) + Math.max(0, g.gap.value);

    const draw = () => {
      const size = Math.max(1, g.size.value);
      if (size !== shownSize) {
        shownSize = size;
        wrapper.style.width = wrapper.style.height = `${size}px`;
        canvas.style.width = canvas.style.height = `${size}px`;
        const px = Math.round(size * dpr);
        if (canvas.width !== px) canvas.width = canvas.height = px;
      }
      ctx.setTransform(canvas.width / size, 0, 0, canvas.width / size, 0, 0);

      const dotSize = Math.max(0, g.dotSize.value);
      const backOpacity = g.backOpacity.value;
      const sink = Math.min(0.9, Math.max(0, g.depth.value));
      const half = Math.max(0.5, g.width.value) / 2;
      const fromBottom = g.from.value;
      const turn = Math.max(0.05, g.duration.value);
      // How far the wave has travelled this sweep (0–1); it holds at 1 through the gap, past the far pole.
      const travel = Math.min(1, (phase * cycleOf()) / turn);
      const center = size / 2;
      const radius = center - dotSize;
      const tiltRad = (g.tilt.value * Math.PI) / 180;
      const sinT = Math.sin(tiltRad);
      const cosT = Math.cos(tiltRad);

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = `rgb(${g.red.value} ${g.green.value} ${g.blue.value})`;
      for (const { points, rows, projected, order, fade } of shapes) {
        // The wave's middle, in rows; it starts and ends fully off the orb so it enters and leaves softly.
        const mid = -half + travel * (rows + half * 2);
        for (let i = 0; i < points.length; i++) {
          const { x, y, z, along } = points[i];
          const a = along + (1 - 2 * along) * fromBottom;
          // 1 at the middle of the wave, easing to 0 `half` rows either side, so only a few rows move at once.
          const dist = Math.abs(a * rows - mid) / half;
          const w = dist < 1 ? Math.cos((Math.PI / 2) * dist) ** 2 : 0;
          const s = 1 - sink * w;
          const p = projected[i];
          // Only x and z scale: each ring narrows toward the vertical axis and never leaves its height.
          const zs = z * s;
          p.x = x * s;
          p.y = y * cosT - zs * sinT;
          p.z = y * sinT + zs * cosT;
          p.w = w;
        }
        order.sort((i, j) => projected[i].z - projected[j].z);

        const alpha = g.alpha.value * fade.value;
        for (const i of order) {
          const p = projected[i];
          const depth = (p.z + 1) / 2; // 0 = back, 1 = front
          // Pulled-in dots shrink and dim, so the wave reads as passing inside the orb.
          const pull = 1 - sink * p.w;
          const r = (dotSize / 2) * (BACK_SCALE + (1 - BACK_SCALE) * depth) * pull;
          const dim = 1 - (1 - SUNK_OPACITY) * p.w * Math.min(1, sink * 4);
          ctx.globalAlpha = alpha * (backOpacity + (1 - backOpacity) * depth) * dim;
          ctx.beginPath();
          ctx.arc(center + p.x * radius, center - p.y * radius, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      let moving = false;
      for (const [k, v] of Object.entries(g)) if (stepGlide(v, dt, k === "rate" ? PAUSE_SETTLE : SETTLE)) moving = true;
      for (const shape of shapes) if (stepGlide(shape.fade, dt, SETTLE)) moving = true;
      shapes = shapes.filter((shape) => shape.fade.target > 0 || shape.fade.value > 0);

      phase = (phase + (dt * g.rate.value) / cycleOf()) % 1;
      draw();
      // Sleep once everything has settled and the animation is paused.
      frame = moving || g.rate.value > 0 ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      sync();
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    wakeRef.current = wake;
    reduceMotion.addEventListener("change", wake);
    sync();
    draw();
    wake();
    return () => {
      cancelAnimationFrame(frame);
      wakeRef.current = null;
      reduceMotion.removeEventListener("change", wake);
    };
  }, []);

  const wrapperStyle: CSSProperties = { width: initialSize, height: initialSize, ...style };

  return (
    <div ref={wrapperRef} role="status" aria-label={label} className={className} style={wrapperStyle} {...rest}>
      <canvas ref={canvasRef} style={{ width: initialSize, height: initialSize, display: "block" }} />
    </div>
  );
}

export default DotTide;
