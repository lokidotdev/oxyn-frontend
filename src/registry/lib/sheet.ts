import { colorTargets, rgb } from "./color";
import { BLEND_SETTLE, FADE_SETTLE } from "./glide";
import type { Frame, Scene, Values } from "./loader-canvas";
import type { MixKey } from "./mix";

/** Square lays the dots on a grid; circle on concentric rings, so the outline is a true circle. */
export type SheetLayout = "square" | "circle";

/**
 * A dot in -1..1 plus its distance from the center, measured along the sheet's own outline. `row` is its line
 * (grid row from the top, or ring from the center), `col` how far along that line it sits (0–1), and `rows`
 * how many lines the sheet has, so motions can follow the pattern's own order.
 */
export type SheetDot = { u: number; v: number; d: number; row: number; col: number; rows: number };

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
    dots.push({ u: 0, v: 0, d: 0, row: 0, col: 0, rows: rings + 1 });
    for (let k = 1; k <= rings; k++) {
      const r = k / rings;
      const count = Math.round(2 * Math.PI * k);
      for (let j = 0; j < count; j++) {
        const a = (j / count) * Math.PI * 2 - Math.PI / 2;
        dots.push({ u: Math.cos(a) * r, v: Math.sin(a) * r, d: r, row: k, col: j / count, rows: rings + 1 });
      }
    }
    return dots;
  }

  // A plain grid. Chebyshev distance makes rings square too.
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const u = (col / (n - 1)) * 2 - 1;
      const v = (row / (n - 1)) * 2 - 1;
      dots.push({ u, v, d: Math.max(Math.abs(u), Math.abs(v)), row, col: col / n, rows: n });
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

export type SheetKey = keyof ReturnType<typeof sheetTargets>;

/**
 * Seconds (roughly) each sheet target takes to glide to a new value; anything unlisted (size, dot size,
 * scale, timing) takes `SETTLE`. Shared by the single loaders and DotSquare / DotCircle.
 */
export const sheetSettle = {
  // Color and opacity: nothing moves, so they change quicker.
  red: FADE_SETTLE,
  green: FADE_SETTLE,
  blue: FADE_SETTLE,
  alpha: FADE_SETTLE,
  minOpacity: FADE_SETTLE,
  // Dot shape and direction morph the dots through an in-between, so they take as long as an animation switch.
  round: BLEND_SETTLE,
  inward: BLEND_SETTLE,
  leftward: BLEND_SETTLE,
  mix_think: BLEND_SETTLE,
  mix_idle: BLEND_SETTLE,
  mix_process: BLEND_SETTLE,
  mix_load: BLEND_SETTLE,
  mix_read: BLEND_SETTLE,
  mix_edit: BLEND_SETTLE,
  mix_ping: BLEND_SETTLE,
  mix_stream: BLEND_SETTLE,
  mix_plan: BLEND_SETTLE,
  mix_upload: BLEND_SETTLE,
  mix_await: BLEND_SETTLE,
  mix_search: BLEND_SETTLE,
};

/** The dots for `layout`. A density change cross-fades the old sheet out while the new one fades in. */
export function sheetShape(layout: SheetLayout) {
  const rows = (s: SheetSettings) => Math.max(3, Math.round(s.density));
  return { key: (s: SheetSettings) => String(rows(s)), build: (s: SheetSettings) => buildSheet(layout, rows(s)) };
}

/**
 * One way a sheet can move. `cycle` is the seconds in one loop; `swell` returns, for time `t` into
 * that loop, each dot's swell (0 resting, 1 at full size).
 */
export interface SheetMotion<K extends string> {
  cycle(v: Values<K | SheetKey>): number;
  swell(t: number, v: Values<K | SheetKey>): (dot: SheetDot) => number;
}

/** A motion's place in its own loop (0–1). Advancing it by rate keeps the motion continuous while the timing glides, and lets pausing coast to a stop. */
function sheetClock<K extends string>(motion: SheetMotion<K>) {
  let phase = 0;
  return {
    advance(dt: number, v: Values<K | SheetKey>) {
      phase = (phase + (dt * v.rate) / motion.cycle(v)) % 1;
    },
    swellOf(v: Values<K | SheetKey>) {
      return motion.swell(phase * motion.cycle(v), v);
    },
  };
}

/** Paints every sheet on screen, each dot swollen by `swellOf`. */
function drawSheet(ctx: CanvasRenderingContext2D, { v, layers, size }: Frame<SheetSettings, SheetKey, SheetDot[]>, swellOf: (dot: SheetDot) => number) {
  const dotSize = Math.max(0, v.dotSize);
  const scale = v.scale;
  const minOpacity = v.minOpacity;
  const round = v.round;
  const center = size / 2;
  // Inset by the largest dot so a fully scaled edge dot is never clipped.
  const reach = center - (dotSize * Math.max(1, scale)) / 2;

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
}

/** A flat sheet of dots that each swell from resting size up to `scale`, then back, as `motion` says. */
export function sheetScene<K extends string>(motion: SheetMotion<K>): Scene<SheetSettings, K | SheetKey, SheetDot[]> {
  const clock = sheetClock(motion);
  return {
    advance(dt, { v }) {
      clock.advance(dt, v);
    },
    draw(ctx, frame) {
      drawSheet(ctx, frame, clock.swellOf(frame.v));
    },
  };
}

/**
 * A sheet that runs several motions, each weighted by its `mix_<name>` glide. Each dot's swell is the
 * weighted blend, so switching the active motion morphs one into the other on the same dots.
 */
export function sheetMixScene<A extends string, K extends string>(
  motions: Record<A, SheetMotion<K>>,
): Scene<SheetSettings, K | SheetKey | MixKey<A>, SheetDot[]> {
  const live = (Object.keys(motions) as A[]).map((name) => ({ key: `mix_${name}` as MixKey<A>, clock: sheetClock(motions[name]) }));
  return {
    advance(dt, { v }) {
      for (const { key, clock } of live) if (v[key] > 0) clock.advance(dt, v);
    },
    draw(ctx, frame) {
      const { v } = frame;
      const parts = live.filter(({ key }) => v[key] > 0).map(({ key, clock }) => ({ weight: v[key], swellOf: clock.swellOf(v) }));
      drawSheet(ctx, frame, (dot) => {
        let s = 0;
        for (const { weight, swellOf } of parts) s += weight * swellOf(dot);
        return s;
      });
    },
  };
}
