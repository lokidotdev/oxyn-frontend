"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

export type DotCascadePattern = "rings" | "fibonacci" | "grid";

export interface DotCascadeProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. */
  pattern?: DotCascadePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds each row takes to complete its 360° turn. */
  duration?: number;
  /** Seconds between one row starting and the next row below it. */
  stagger?: number;
  /** Seconds the orb rests after the bottom row finishes, before the next wave. */
  gap?: number;
  /** Spin direction around the vertical axis. */
  direction?: "left" | "right";
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
/** Seconds (roughly) a resting row takes to settle back square after a timing change knocked it off. */
const REALIGN = 0.12;

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

/** A point on the unit sphere plus the row (layer) it belongs to, top = 0. */
type Point = { x: number; y: number; z: number; layer: number };

function buildPoints(pattern: DotCascadePattern, density: number) {
  const rows = Math.max(3, Math.round(density));
  const points: Point[] = [];

  if (pattern === "fibonacci") {
    // The spiral has no real rows, so band dots by height into `rows` layers.
    const count = Math.round(rows * rows * 1.25);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - ((i + 0.5) / count) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * golden;
      points.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, layer: Math.round(((1 - y) / 2) * rows) });
    }
    return { points, layers: rows + 1 };
  }

  // Rings and grid share latitude rows; poles get a single dot each.
  points.push({ x: 0, y: 1, z: 0, layer: 0 }, { x: 0, y: -1, z: 0, layer: rows });
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
      points.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, layer: i });
    }
  }
  return { points, layers: rows + 1 };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

type Settings = Required<
  Pick<
    DotCascadeProps,
    "pattern" | "dotSize" | "density" | "size" | "duration" | "stagger" | "gap" | "direction" | "tilt" | "color" | "backOpacity" | "paused"
  >
>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  const [red, green, blue, alpha] = parseColor(s.color);
  return {
    dotSize: s.dotSize,
    size: s.size,
    duration: s.duration,
    stagger: s.stagger,
    gap: s.gap,
    // Spin velocity sign; flipping it slows turning rows, stops them, and turns them back the other way.
    dir: s.direction === "left" ? 1 : -1,
    tilt: s.tilt,
    backOpacity: s.backOpacity,
    red,
    green,
    blue,
    alpha,
    rate: s.paused ? 0 : 1,
  };
}

function buildShape(pattern: DotCascadePattern, density: number) {
  const { points, layers } = buildPoints(pattern, density);
  return {
    key: `${pattern}:${Math.max(3, Math.round(density))}`,
    points,
    layers,
    // Each row's spin angle, accumulated so timing changes mid-turn bend the motion instead of jumping it.
    angles: new Float64Array(layers),
    layerSin: new Float64Array(layers),
    layerCos: new Float64Array(layers).fill(1),
    projected: points.map(() => ({ x: 0, y: 0, z: 0 })),
    order: points.map((_, i) => i),
    fade: glide(1),
  };
}

export function DotCascade({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 1.4,
  stagger = 0.08,
  gap = 0.6,
  direction = "left",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  className,
  style,
  ...rest
}: DotCascadeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only the first size reaches the DOM through React; after that the loop glides it.
  const [initialSize] = useState(size);
  const settings: Settings = { pattern, dotSize, density, size, duration, stagger, gap, direction, tilt, color, backOpacity, paused };
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
    // Position within the current wave (0–1), advanced by rate so pausing coasts to a stop.
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

    const cycleOf = () => {
      // Sized for the tallest orb on screen, so a fading-out orb's rows still finish their turn.
      const layers = Math.max(...shapes.map((shape) => shape.layers));
      return (layers - 1) * Math.max(0, g.stagger.value) + Math.max(0.05, g.duration.value) + Math.max(0, g.gap.value);
    };

    /** Advances every row's angle as the wave moves from cycle position `from` to `to` (which may run past 1). */
    const spin = (from: number, to: number, dt: number) => {
      const turn = Math.max(0.05, g.duration.value);
      const stagger = Math.max(0, g.stagger.value);
      const cycle = cycleOf();
      const settle = 1 - Math.exp(-dt / REALIGN);

      // Each row runs one eased 360° turn, starting `stagger` seconds after the row above.
      const progress = (p: number, l: number) => {
        const whole = Math.floor(p);
        return whole + Math.min(1, Math.max(0, ((p - whole) * cycle - l * stagger) / turn));
      };
      const turnsAt = (p: number, l: number) => {
        const x = progress(p, l);
        const whole = Math.floor(x);
        return whole + easeInOutCubic(x - whole);
      };

      for (const shape of shapes) {
        for (let l = 0; l < shape.layers; l++) {
          let a = shape.angles[l] + (turnsAt(to, l) - turnsAt(from, l)) * Math.PI * 2 * g.dir.value;
          a %= Math.PI * 2;
          const x = progress(to, l) % 1;
          // A row at rest belongs square to the orb; ease it back if a timing change left it skewed.
          if (x === 0) a -= (a - Math.PI * 2 * Math.round(a / (Math.PI * 2))) * settle;
          shape.angles[l] = a;
          shape.layerSin[l] = Math.sin(a);
          shape.layerCos[l] = Math.cos(a);
        }
      }
    };

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
      const center = size / 2;
      const radius = center - dotSize;
      const tiltRad = (g.tilt.value * Math.PI) / 180;
      const sinT = Math.sin(tiltRad);
      const cosT = Math.cos(tiltRad);

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = `rgb(${g.red.value} ${g.green.value} ${g.blue.value})`;
      for (const { points, layerSin, layerCos, projected, order, fade } of shapes) {
        for (let i = 0; i < points.length; i++) {
          const { x, y, z, layer } = points[i];
          const sinA = layerSin[layer];
          const cosA = layerCos[layer];
          // Spin the row around the vertical axis, then tilt toward the viewer.
          const x1 = x * cosA + z * sinA;
          const z1 = -x * sinA + z * cosA;
          const p = projected[i];
          p.x = x1;
          p.y = y * cosT - z1 * sinT;
          p.z = y * sinT + z1 * cosT;
        }
        order.sort((i, j) => projected[i].z - projected[j].z);

        const alpha = g.alpha.value * fade.value;
        for (const i of order) {
          const p = projected[i];
          const depth = (p.z + 1) / 2; // 0 = back, 1 = front
          const r = (dotSize / 2) * (BACK_SCALE + (1 - BACK_SCALE) * depth);
          ctx.globalAlpha = alpha * (backOpacity + (1 - backOpacity) * depth);
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

      const next = phase + (dt * g.rate.value) / cycleOf();
      spin(phase, next, dt);
      phase = next % 1;
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

export default DotCascade;
