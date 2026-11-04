"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

export interface NoiseRingsProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of concentric rings (1–5). */
  lines?: number;
  /** Stroke width of each ring in px. */
  lineWidth?: number;
  /** Furthest the outer ring is pushed in or out by the noise, in px. Inner rings move proportionally less. */
  amplitude?: number;
  /** How many bumps run around a ring. Low values give broad, soft swells; high values give tighter ripples. */
  frequency?: number;
  /** How fast the noise drifts over time. */
  speed?: number;
  /** How differently neighboring rings move. 0 keeps them in lockstep; higher lets each ring wander on its own. */
  spread?: number;
  /** Gap between neighboring rings in px. */
  lineSpacing?: number;
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Line color, any CSS color. */
  color?: string;
  /** Opacity of the innermost ring (0–1). The outer ring is always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

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

/**
 * Raw noise rarely leaves ±0.5; this stretches it so `amplitude` is close to the real swing.
 * The tanh around it is a soft limit, so peaks round off instead of flattening into corners.
 */
const NOISE_GAIN = 2.2;

// Improved Perlin noise (3D). The quintic fade keeps the field smooth through its
// second derivative, so the rings bend in soft curves with no creases at cell edges.
const perm = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  // Fixed seed so every render (and the server) gets the same field.
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from({ length: 512 }, (_, i) => p[i & 255]);
})();

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** Smooth noise in roughly -1..1. */
function noise3(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = perm[X] + Y;
  const AA = perm[A] + Z;
  const AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y;
  const BA = perm[B] + Z;
  const BB = perm[B + 1] + Z;
  return lerp(
    lerp(
      lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  );
}

type Settings = Required<
  Pick<
    NoiseRingsProps,
    "lines" | "lineWidth" | "amplitude" | "frequency" | "speed" | "spread" | "lineSpacing" | "size" | "color" | "minOpacity" | "paused"
  >
>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  const [red, green, blue, alpha] = parseColor(s.color);
  return {
    lines: Math.min(5, Math.max(1, Math.round(s.lines))),
    lineWidth: s.lineWidth,
    amplitude: s.amplitude,
    frequency: s.frequency,
    speed: s.speed,
    spread: s.spread,
    lineSpacing: s.lineSpacing,
    size: s.size,
    minOpacity: s.minOpacity,
    red,
    green,
    blue,
    alpha,
    rate: s.paused ? 0 : 1,
  };
}

export function NoiseRings({
  lines = 4,
  lineWidth = 1,
  amplitude = 8,
  frequency = 0.8,
  speed = 0.35,
  spread = 0.12,
  lineSpacing = 3,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Thinking",
  className,
  style,
  ...rest
}: NoiseRingsProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only the first size reaches the DOM through React; after that the loop glides it.
  const [initialSize] = useState(size);
  const settings: Settings = { lines, lineWidth, amplitude, frequency, speed, spread, lineSpacing, size, color, minOpacity, paused };
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
    // Noise time. Advancing it by speed × rate (rather than multiplying elapsed time by speed)
    // keeps the field still when speed changes, and lets pausing coast to a stop.
    let time = 0;
    let shownSize = -1;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let frame = 0;
    let last = 0;

    const sync = () => {
      retarget(g, targetsOf(settingsRef.current));
      // Reduced motion: hold still and apply changes at once.
      if (reduceMotion.matches) {
        g.rate.target = 0;
        snapAll(g);
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

      const lineWidth = Math.max(0, g.lineWidth.value);
      const amplitude = Math.max(0, g.amplitude.value);
      const frequency = g.frequency.value;
      const spread = g.spread.value;
      const minOpacity = g.minOpacity.value;
      // Fractional while gliding: the ring past the whole count fades in or out.
      const count = Math.max(1, g.lines.value);
      const center = size / 2;
      // Inset by the widest swing so the outer ring is never clipped.
      const outer = Math.max(1, center - amplitude - lineWidth);
      const spacing = Math.max(0, g.lineSpacing.value);
      // Enough samples that the curve stays smooth at any size.
      const samples = Math.max(64, Math.ceil((2 * Math.PI * center) / 3));
      if (xs.length < samples) {
        xs = new Float32Array(samples);
        ys = new Float32Array(samples);
      }

      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = `rgb(${g.red.value} ${g.green.value} ${g.blue.value})`;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";

      // Rings are counted inward from the outer edge, so adding one only touches the innermost.
      for (let j = 0; j < Math.ceil(count); j++) {
        const presence = Math.min(1, count - j);
        const k = Math.max(0, 1 - j / Math.max(1, count - 1)); // 1 = outer, 0 = innermost
        // Rings step inward from the outer edge, `lineSpacing` apart.
        const base = Math.max(1, outer - j * spacing);
        const frac = base / outer;
        // Inner rings swing less, so the whole field warps like one surface.
        const swing = amplitude * frac;
        // Walking the noise around a circle closes the loop seamlessly; each ring
        // reads a slightly different slice of time so neighbors ripple together.
        const z = time - j * spread;

        for (let i = 0; i < samples; i++) {
          const a = (i / samples) * Math.PI * 2;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const r = base + Math.tanh(noise3(cos * frequency, sin * frequency, z) * NOISE_GAIN) * swing;
          xs[i] = center + cos * r;
          ys[i] = center + sin * r;
        }

        // Curve through segment midpoints for a stroke with no visible corners.
        ctx.globalAlpha = g.alpha.value * presence * (minOpacity + (1 - minOpacity) * k);
        ctx.beginPath();
        const end = samples - 1;
        ctx.moveTo((xs[end] + xs[0]) / 2, (ys[end] + ys[0]) / 2);
        for (let i = 0; i < samples; i++) {
          const n = (i + 1) % samples;
          ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[n]) / 2, (ys[i] + ys[n]) / 2);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      let moving = false;
      for (const [k, v] of Object.entries(g)) if (stepGlide(v, dt, k === "rate" ? PAUSE_SETTLE : SETTLE)) moving = true;
      time += dt * g.speed.value * g.rate.value;
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

export default NoiseRings;
