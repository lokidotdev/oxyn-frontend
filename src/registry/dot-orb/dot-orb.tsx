"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

export type DotOrbPattern = "rings" | "fibonacci" | "grid";

export interface DotOrbProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. */
  pattern?: DotOrbPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds for one full 360° turn. */
  duration?: number;
  /** Seconds to rest between turns. 0 spins continuously; above 0 each turn eases in and out. */
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
/** Gap (s) at which a turn is fully eased; smaller gaps blend toward a linear spin, 0 being linear. */
const EASE_GAP = 0.2;

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

type Vec3 = [number, number, number];

function buildPoints(pattern: DotOrbPattern, density: number): Vec3[] {
  const rows = Math.max(3, Math.round(density));
  const points: Vec3[] = [];

  if (pattern === "fibonacci") {
    const count = Math.round(rows * rows * 1.25);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - ((i + 0.5) / count) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * golden;
      points.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    return points;
  }

  // Rings and grid share latitude rows; poles get a single dot each.
  points.push([0, 1, 0], [0, -1, 0]);
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
      points.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
  }
  return points;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

type Settings = Required<
  Pick<DotOrbProps, "pattern" | "dotSize" | "density" | "size" | "duration" | "gap" | "direction" | "tilt" | "color" | "backOpacity" | "paused">
>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  const [red, green, blue, alpha] = parseColor(s.color);
  return {
    dotSize: s.dotSize,
    size: s.size,
    duration: s.duration,
    gap: s.gap,
    // Spin velocity sign; flipping it slows the orb, stops it, and spins it back up the other way.
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

function buildShape(pattern: DotOrbPattern, density: number) {
  const points = buildPoints(pattern, density);
  return {
    key: `${pattern}:${Math.max(3, Math.round(density))}`,
    points,
    projected: points.map(() => ({ x: 0, y: 0, z: 0 })),
    order: points.map((_, i) => i),
    fade: glide(1),
  };
}

export function DotOrb({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 3,
  gap = 0,
  direction = "left",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  className,
  style,
  ...rest
}: DotOrbProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only the first size reaches the DOM through React; after that the loop glides it.
  const [initialSize] = useState(size);
  const settings: Settings = { pattern, dotSize, density, size, duration, gap, direction, tilt, color, backOpacity, paused };
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
    // Position within the current cycle (0–1), advanced by rate so pausing coasts to a stop.
    let phase = 0;
    // The spin angle is accumulated rather than derived from phase, so changing
    // duration, gap or direction mid-turn bends the motion instead of jumping it.
    let angle = 0;
    let shownSize = -1;
    let frame = 0;
    let last = 0;

    /** Turns completed by cycle position `p` (which may run past 1), with the current timing. */
    const turnsAt = (p: number) => {
      const turn = Math.max(0.05, g.duration.value);
      const gap = Math.max(0, g.gap.value);
      const whole = Math.floor(p);
      const x = Math.min(1, ((p - whole) * (turn + gap)) / turn);
      // One turn per cycle, then rest for `gap`. With no gap the spin is linear
      // so consecutive turns join seamlessly.
      return whole + x + (easeInOutCubic(x) - x) * Math.min(1, gap / EASE_GAP);
    };

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
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = `rgb(${g.red.value} ${g.green.value} ${g.blue.value})`;
      for (const { points, projected, order, fade } of shapes) {
        for (let i = 0; i < points.length; i++) {
          const [x, y, z] = points[i];
          // Spin around the vertical axis, then tilt toward the viewer.
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

      const cycle = Math.max(0.05, g.duration.value) + Math.max(0, g.gap.value);
      const next = phase + (dt * g.rate.value) / cycle;
      angle = (angle + (turnsAt(next) - turnsAt(phase)) * Math.PI * 2 * g.dir.value) % (Math.PI * 2);
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

export default DotOrb;
