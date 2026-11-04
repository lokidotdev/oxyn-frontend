"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

export interface ArcRingsProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of concentric rings (1–6). */
  lines?: number;
  /** Cuts in each ring (1–8). The ring is split into this many equal arcs. */
  cuts?: number;
  /** Angular width of each cut in degrees. */
  cutSpacing?: number;
  /** Gap between neighboring rings in px. */
  lineSpacing?: number;
  /** Stroke width of each ring in px. */
  lineWidth?: number;
  /** Turns per second of the outer ring. */
  speed?: number;
  /** Spin neighboring rings in opposite directions. */
  alternate?: boolean;
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

const TAU = Math.PI * 2;

type Settings = Required<
  Pick<
    ArcRingsProps,
    "lines" | "cuts" | "cutSpacing" | "lineSpacing" | "lineWidth" | "speed" | "alternate" | "size" | "color" | "minOpacity" | "paused"
  >
>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  const [red, green, blue, alpha] = parseColor(s.color);
  return {
    lines: Math.min(6, Math.max(1, Math.round(s.lines))),
    cutSpacing: s.cutSpacing,
    lineSpacing: s.lineSpacing,
    lineWidth: s.lineWidth,
    speed: s.speed,
    // 1 = every ring spins the same way, -1 = neighbors counter-rotate. Gliding through 0 eases the switch.
    direction: s.alternate ? -1 : 1,
    size: s.size,
    minOpacity: s.minOpacity,
    red,
    green,
    blue,
    alpha,
    rate: s.paused ? 0 : 1,
  };
}

export function ArcRings({
  lines = 3,
  cuts = 3,
  cutSpacing = 30,
  lineSpacing = 8,
  lineWidth = 1.5,
  speed = 0.3,
  alternate = true,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.4,
  paused = false,
  label = "Thinking",
  className,
  style,
  ...rest
}: ArcRingsProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only the first size reaches the DOM through React; after that the loop glides it.
  const [initialSize] = useState(size);
  const settings: Settings = { lines, cuts, cutSpacing, lineSpacing, lineWidth, speed, alternate, size, color, minOpacity, paused };
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
    // Turns travelled by the outer ring. Advancing it by speed × rate (rather than multiplying
    // elapsed time by speed) keeps the rings still when speed changes, and lets pausing coast.
    let turns = 0;
    let shownSize = -1;
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
      const spacing = Math.max(0, g.lineSpacing.value);
      const minOpacity = g.minOpacity.value;
      // A cut count can't be fractional, so it switches at once instead of gliding.
      const cuts = Math.min(8, Math.max(1, Math.round(settingsRef.current.cuts)));
      const segment = TAU / cuts;
      const cut = Math.min(segment, (Math.max(0, g.cutSpacing.value) * Math.PI) / 180);
      // Fractional while gliding: the ring past the whole count fades in or out.
      const count = Math.max(1, g.lines.value);
      const center = size / 2;
      const outer = Math.max(1, center - lineWidth);

      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = `rgb(${g.red.value} ${g.green.value} ${g.blue.value})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";

      // Rings are counted inward from the outer edge, so adding one only touches the innermost.
      for (let j = 0; j < Math.ceil(count); j++) {
        const radius = outer - j * spacing;
        if (radius <= lineWidth / 2) break;
        const presence = Math.min(1, count - j);
        const k = Math.max(0, 1 - j / Math.max(1, count - 1)); // 1 = outer, 0 = innermost
        const spin = j % 2 === 0 ? 1 : g.direction.value;
        // Each ring starts half a segment on from its neighbor, so the cuts don't line up.
        const rotation = turns * TAU * spin + j * (segment / 2) - Math.PI / 2;

        ctx.globalAlpha = g.alpha.value * presence * (minOpacity + (1 - minOpacity) * k);
        ctx.beginPath();
        if (cut <= 0) {
          ctx.arc(center, center, radius, 0, TAU);
        } else {
          // Round caps reach past the arc's ends, so pull them back to keep the cut its real width.
          const cap = lineWidth / 2 / radius;
          const length = segment - cut - 2 * cap;
          if (length > 0) {
            for (let i = 0; i < cuts; i++) {
              const start = rotation + i * segment + cut / 2 + cap;
              ctx.moveTo(center + Math.cos(start) * radius, center + Math.sin(start) * radius);
              ctx.arc(center, center, radius, start, start + length);
            }
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      let moving = false;
      for (const [k, v] of Object.entries(g)) if (stepGlide(v, dt, k === "rate" ? PAUSE_SETTLE : SETTLE)) moving = true;
      turns = (turns + dt * g.speed.value * g.rate.value) % 1;
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

export default ArcRings;
