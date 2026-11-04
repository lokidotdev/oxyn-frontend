"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

export interface SquarePulseProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Shape of each dot. */
  dotShape?: "round" | "square";
  /** Resting dot size in px. */
  dotSize?: number;
  /** How many times larger a dot grows at the peak of the animation. */
  scale?: number;
  /** Dots per row across the sheet. */
  density?: number;
  /** Canvas size in px (the sheet is square). */
  size?: number;
  /** Seconds for one ring to travel across the sheet. */
  duration?: number;
  /** Seconds to rest between rings. */
  gap?: number;
  /** Thickness of the ring of large dots, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** "out" spreads from the center to the edge; "in" closes from the edge to the center. */
  direction?: "out" | "in";
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Dots inside the ring are always 1. */
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

/** Fills one dot. `round` 0 is a square, 1 a circle, and anything between a rounded square. */
function fillDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, round: number) {
  if (round >= 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (round <= 0 || !ctx.roundRect) {
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  } else {
    ctx.beginPath();
    ctx.roundRect(x - r, y - r, r * 2, r * 2, r * round);
    ctx.fill();
  }
}

/** Dot positions in -1..1 plus their distance from the center, measured along the square. */
function buildSheet(density: number) {
  const n = Math.max(3, Math.round(density));
  const dots: { u: number; v: number; d: number }[] = [];

  // A plain grid. Chebyshev distance makes rings square too.
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const u = (col / (n - 1)) * 2 - 1;
      const v = (row / (n - 1)) * 2 - 1;
      dots.push({ u, v, d: Math.max(Math.abs(u), Math.abs(v)) });
    }
  }
  return dots;
}

type Settings = Required<
  Pick<SquarePulseProps, "dotShape" | "dotSize" | "scale" | "density" | "size" | "duration" | "gap" | "ringWidth" | "direction" | "color" | "minOpacity" | "paused">
>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  const [red, green, blue, alpha] = parseColor(s.color);
  return {
    dotSize: s.dotSize,
    scale: s.scale,
    size: s.size,
    duration: s.duration,
    gap: s.gap,
    ringWidth: s.ringWidth,
    // 0 spreads out from the center, 1 closes in from the edge; between, the ring flattens across.
    inward: s.direction === "in" ? 1 : 0,
    minOpacity: s.minOpacity,
    round: s.dotShape === "round" ? 1 : 0,
    red,
    green,
    blue,
    alpha,
    rate: s.paused ? 0 : 1,
  };
}

export function SquarePulse({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 1.6,
  gap = 0.3,
  ringWidth = 0.35,
  direction = "out",
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  className,
  style,
  ...rest
}: SquarePulseProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only the first size reaches the DOM through React; after that the loop glides it.
  const [initialSize] = useState(size);
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, ringWidth, direction, color, minOpacity, paused };
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
    // A density change cross-fades the old sheet out while the new one fades in.
    const first = Math.max(3, Math.round(settingsRef.current.density));
    let sheets = [{ n: first, dots: buildSheet(first), fade: glide(1) }];
    // Position within the current cycle (0–1). Advancing it by rate keeps the motion
    // continuous while duration and gap glide, and lets pausing coast to a stop.
    let phase = 0;
    let shownSize = -1;
    let frame = 0;
    let last = 0;

    const sync = () => {
      const s = settingsRef.current;
      retarget(g, targetsOf(s));
      const n = Math.max(3, Math.round(s.density));
      if (n !== sheets[sheets.length - 1].n) {
        for (const sheet of sheets) sheet.fade.target = 0;
        const fade = glide(0);
        fade.target = 1;
        sheets.push({ n, dots: buildSheet(n), fade });
      }
      // Reduced motion: hold still and apply changes at once.
      if (reduceMotion.matches) {
        g.rate.target = 0;
        snapAll(g);
        for (const sheet of sheets) snapAll({ fade: sheet.fade });
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
      const scale = g.scale.value;
      const minOpacity = g.minOpacity.value;
      const round = g.round.value;
      const center = size / 2;
      // Inset by the largest dot so a fully scaled edge dot is never clipped.
      const reach = center - (dotSize * Math.max(1, scale)) / 2;
      const turn = Math.max(0.05, g.duration.value);
      const cycle = turn + Math.max(0, g.gap.value);
      const width = Math.max(0.05, g.ringWidth.value);
      const inward = g.inward.value;
      const t = phase * cycle;
      // The ring starts fully inside the center and ends fully past the edge, so
      // every dot gets one complete swell. During the gap it sits off-sheet.
      const ring = t < turn ? -width + (t / turn) * (1 + 2 * width) : Infinity;

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = `rgb(${g.red.value} ${g.green.value} ${g.blue.value})`;
      for (const sheet of sheets) {
        const alpha = g.alpha.value * sheet.fade.value;
        for (const { u, v, d } of sheet.dots) {
          const distance = d + (1 - 2 * d) * inward;
          const x = Math.abs(distance - ring) / width;
          // Cosine bump: 1 at the ring's center line, easing to 0 at its edges.
          const s = x < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * x) : 0;
          const r = (dotSize / 2) * (1 + (scale - 1) * s);
          ctx.globalAlpha = alpha * (minOpacity + (1 - minOpacity) * s);
          fillDot(ctx, center + u * reach, center + v * reach, r, round);
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      let moving = false;
      for (const [k, v] of Object.entries(g)) if (stepGlide(v, dt, k === "rate" ? PAUSE_SETTLE : SETTLE)) moving = true;
      for (const sheet of sheets) if (stepGlide(sheet.fade, dt, SETTLE)) moving = true;
      sheets = sheets.filter((sheet) => sheet.fade.target > 0 || sheet.fade.value > 0);

      const cycle = Math.max(0.05, g.duration.value) + Math.max(0, g.gap.value);
      phase = (phase + (dt * g.rate.value) / cycle) % 1;
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

export default SquarePulse;
