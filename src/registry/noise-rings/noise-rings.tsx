"use client";

import type { HTMLAttributes } from "react";
import { colorTargets, rgb } from "../lib/color";
import { LoaderCanvas } from "../lib/loader-canvas";
import type { Scene } from "../lib/loader-canvas";

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
  return {
    ...colorTargets(s.color),
    lines: Math.min(5, Math.max(1, Math.round(s.lines))),
    lineWidth: s.lineWidth,
    amplitude: s.amplitude,
    frequency: s.frequency,
    speed: s.speed,
    spread: s.spread,
    lineSpacing: s.lineSpacing,
    minOpacity: s.minOpacity,
  };
}

type Key = keyof ReturnType<typeof targetsOf>;

function scene(): Scene<Settings, Key, never> {
  let time = 0;
  let xs = new Float32Array(0);
  let ys = new Float32Array(0);

  return {
    advance(dt, { v }) {
      time += dt * v.speed * v.rate;
    },
    draw(ctx, { v, size }) {
      const lineWidth = Math.max(0, v.lineWidth);
      const amplitude = Math.max(0, v.amplitude);
      const frequency = v.frequency;
      const spread = v.spread;
      const minOpacity = v.minOpacity;
      // Fractional while gliding: the ring past the whole count fades in or out.
      const count = Math.max(1, v.lines);
      const center = size / 2;
      // Inset by the widest swing so the outer ring is never clipped.
      const outer = Math.max(1, center - amplitude - lineWidth);
      const spacing = Math.max(0, v.lineSpacing);
      // Enough samples that the curve stays smooth at any size.
      const samples = Math.max(64, Math.ceil((2 * Math.PI * center) / 3));
      if (xs.length < samples) {
        xs = new Float32Array(samples);
        ys = new Float32Array(samples);
      }

      ctx.strokeStyle = rgb(v);
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
        ctx.globalAlpha = v.alpha * presence * (minOpacity + (1 - minOpacity) * k);
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
    },
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
  ...rest
}: NoiseRingsProps) {
  const settings: Settings = { lines, lineWidth, amplitude, frequency, speed, spread, lineSpacing, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} scene={scene} label={label} {...rest} />;
}

export default NoiseRings;
