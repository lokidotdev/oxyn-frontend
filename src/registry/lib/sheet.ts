import { colorTargets, rgb } from "./color";
import type { Scene, Values } from "./loader-canvas";

/** Square lays the dots on a grid; circle on concentric rings, so the outline is a true circle. */
export type SheetLayout = "square" | "circle";

/** A dot in -1..1 plus its distance from the center, measured along the sheet's own outline. */
export type SheetDot = { u: number; v: number; d: number };

/** Props every flat dot sheet takes. */
export interface SheetSettings {
  dotShape: "round" | "square";
  dotSize: number;
  scale: number;
  density: number;
  size: number;
  color: string;
  minOpacity: number;
  paused: boolean;
}

function buildSheet(layout: SheetLayout, n: number) {
  const dots: SheetDot[] = [];

  if (layout === "circle") {
    // Concentric rings with near-equal arc spacing, so the outline is a true circle.
    const rings = Math.max(1, Math.round((n - 1) / 2));
    dots.push({ u: 0, v: 0, d: 0 });
    for (let k = 1; k <= rings; k++) {
      const r = k / rings;
      const count = Math.round(2 * Math.PI * k);
      for (let j = 0; j < count; j++) {
        const a = (j / count) * Math.PI * 2 - Math.PI / 2;
        dots.push({ u: Math.cos(a) * r, v: Math.sin(a) * r, d: r });
      }
    }
    return dots;
  }

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

/** The sheet's own glide targets; spread these into a component's targets. */
export function sheetTargets(s: SheetSettings) {
  return {
    ...colorTargets(s.color),
    dotSize: s.dotSize,
    scale: s.scale,
    minOpacity: s.minOpacity,
    round: s.dotShape === "round" ? 1 : 0,
  };
}

type SheetKey = keyof ReturnType<typeof sheetTargets>;

/** The dots for `layout`. A density change cross-fades the old sheet out while the new one fades in. */
export function sheetShape(layout: SheetLayout) {
  const rows = (s: SheetSettings) => Math.max(3, Math.round(s.density));
  return { key: (s: SheetSettings) => String(rows(s)), build: (s: SheetSettings) => buildSheet(layout, rows(s)) };
}

/**
 * A flat sheet of dots that each swell from resting size up to `scale`, then back.
 * `cycle` is the seconds in one loop; `swell` returns, for time `t` into that loop, each dot's swell (0–1).
 */
export function sheetScene<K extends string>(
  cycle: (v: Values<K | SheetKey>) => number,
  swell: (t: number, v: Values<K | SheetKey>) => (dot: SheetDot) => number,
): () => Scene<SheetSettings, K | SheetKey, SheetDot[]> {
  return () => {
    // Position within the current cycle (0–1). Advancing it by rate keeps the motion
    // continuous while the timing glides, and lets pausing coast to a stop.
    let phase = 0;
    return {
      advance(dt, { v }) {
        phase = (phase + (dt * v.rate) / cycle(v)) % 1;
      },
      draw(ctx, { v, layers, size }) {
        const dotSize = Math.max(0, v.dotSize);
        const scale = v.scale;
        const minOpacity = v.minOpacity;
        const round = v.round;
        const center = size / 2;
        // Inset by the largest dot so a fully scaled edge dot is never clipped.
        const reach = center - (dotSize * Math.max(1, scale)) / 2;
        const swellOf = swell(phase * cycle(v), v);

        ctx.fillStyle = rgb(v);
        for (const { shape, fade } of layers) {
          const alpha = v.alpha * fade;
          for (const dot of shape) {
            const s = swellOf(dot);
            const r = (dotSize / 2) * (1 + (scale - 1) * s);
            ctx.globalAlpha = alpha * (minOpacity + (1 - minOpacity) * s);
            fillDot(ctx, center + dot.u * reach, center + dot.v * reach, r, round);
          }
        }
      },
    };
  };
}
