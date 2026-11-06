import { colorTargets, rgb } from "./color";
import { BLEND_SETTLE } from "./glide";
import type { Frame } from "./loader-canvas";

/** How the dots are laid out on the sphere. */
export type GlobePattern = "rings" | "fibonacci" | "grid";

/** Props every dot sphere takes. */
export interface GlobeSettings {
  pattern: GlobePattern;
  dotSize: number;
  density: number;
  size: number;
  tilt: number;
  color: string;
  backOpacity: number;
  paused: boolean;
}

/**
 * A point on the unit sphere. `row` is its latitude row from the top (0 to `rows`); `step` is its
 * place in the pattern's own order, which on the spiral winds down the arms instead of the rows.
 */
export type GlobePoint = { x: number; y: number; z: number; row: number; step: number };

/** Where `place` puts a point before the tilt, plus how much it shrinks (`size`) and dims (`dim`). */
export type Placed = { x: number; y: number; z: number; size: number; dim: number };

/** Back dots are drawn at this fraction of `dotSize`. */
const BACK_SCALE = 0.35;
/** Rows the spiral stripe drops over one full turn around the orb, as a fraction of all rows. */
const SPIRAL_PITCH = 0.5;

function rowsOf(s: GlobeSettings) {
  return Math.max(3, Math.round(s.density));
}

function buildPoints(pattern: GlobePattern, rows: number) {
  const points: GlobePoint[] = [];

  if (pattern === "fibonacci") {
    // The spiral has no rows, so band dots by height into rows, and let the step follow its arms:
    // mixing height with how far around the orb a dot sits turns a wave into a diagonal stripe
    // winding down the sphere. The stripe's seam (where "around" wraps) sits at the back, where the dots are faintest.
    const count = Math.round(rows * rows * 1.25);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pitch = rows * SPIRAL_PITCH;
    for (let i = 0; i < count; i++) {
      const y = 1 - ((i + 0.5) / count) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * golden;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const around = Math.atan2(-x, z) / (Math.PI * 2) + 0.5;
      points.push({ x, y, z, row: Math.round(((1 - y) / 2) * rows), step: ((1 - y) / 2) * rows + around * pitch });
    }
    return { points, steps: rows + pitch };
  }

  // Rings and grid share latitude rows; each row moves as one, so its step is its row number.
  // Poles get a single dot each.
  points.push({ x: 0, y: 1, z: 0, row: 0, step: 0 }, { x: 0, y: -1, z: 0, row: rows, step: rows });
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
      points.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, row: i, step: i });
    }
  }
  return { points, steps: rows };
}

/** The sphere's points, plus scratch space for projecting and depth-sorting them each frame. */
export interface GlobeShape {
  pattern: GlobePattern;
  points: GlobePoint[];
  rows: number;
  /** The last step on the orb, so a sweep from step 0 to `steps` crosses all of it. */
  steps: number;
  placed: Placed[];
  order: number[];
  // Each row's own spin angle, for animations that turn rows separately. Accumulated so
  // timing changes mid-turn bend the motion instead of jumping it.
  rowAngles: Float64Array;
  rowSin: Float64Array;
  rowCos: Float64Array;
  /** This orb's fade as of the last frame: 0 to 1 while it morphs in, 1 to 0 while it morphs out. */
  fade: number;
  /** Set while this orb morphs in: each point sets off from `from`'s point `source[i]`. */
  arrival: { from: GlobeShape; source: Int32Array; frozen: number | null } | null;
  /**
   * Set while this orb morphs out. Points some new point set off from (`kept`) hand over to it at once;
   * the rest travel into `to`'s point `target[i]` and fade on the way.
   */
  leaving: { to: GlobeShape; target: Int32Array; kept: Uint8Array; start: number } | null;
}

export function buildGlobe(s: GlobeSettings): GlobeShape {
  const rows = rowsOf(s);
  const { points, steps } = buildPoints(s.pattern, rows);
  return {
    pattern: s.pattern,
    points,
    rows,
    steps,
    placed: points.map((): Placed => ({ x: 0, y: 0, z: 0, size: 1, dim: 1 })),
    order: points.map((_, i) => i),
    rowAngles: new Float64Array(rows + 1),
    rowSin: new Float64Array(rows + 1),
    rowCos: new Float64Array(rows + 1).fill(1),
    fade: 1,
    arrival: null,
    leaving: null,
  };
}

/** For each point in `to`, the closest point in `from` on the sphere. */
function nearest(from: GlobePoint[], to: GlobePoint[]) {
  const out = new Int32Array(to.length);
  for (let i = 0; i < to.length; i++) {
    const p = to[i];
    let best = -Infinity;
    for (let j = 0; j < from.length; j++) {
      const q = from[j];
      const dot = p.x * q.x + p.y * q.y + p.z * q.z;
      if (dot > best) {
        best = dot;
        out[i] = j;
      }
    }
  }
  return out;
}

/**
 * Links an orb to the one replacing it, so the same dots travel into the new layout instead of
 * the two cross-fading. Every new dot sets off from its closest old dot; old dots no new one picked
 * glide into their closest new dot and fade out there.
 */
function morphGlobe(from: GlobeShape, to: GlobeShape, fade: number) {
  // A change mid-morph: hold the old orb where it got to, and set off from there.
  if (from.arrival) {
    if (fade < 1) from.arrival.frozen = fade;
    else from.arrival = null;
  }
  const source = nearest(from.points, to.points);
  const kept = new Uint8Array(from.points.length);
  for (const j of source) kept[j] = 1;
  to.arrival = { from, source, frozen: null };
  from.leaving = { to, target: nearest(to.points, from.points), kept, start: Math.max(1e-3, fade) };
}

/** Identifies an orb's geometry; a pattern or density change morphs the old orb's dots into the new one. */
export function globeKey(s: GlobeSettings) {
  return `${s.pattern}:${rowsOf(s)}`;
}

/**
 * Dots only travel to their nearest spot in the new layout, a short way, so a pattern or density change
 * takes the same ~300ms as switching animation: every structural change in the row blends at one pace.
 */
export const globeShape = { key: globeKey, build: buildGlobe, morph: morphGlobe, settle: BLEND_SETTLE };

/** The globe's own glide targets; spread these into a component's targets. */
export function globeTargets(s: GlobeSettings) {
  return { ...colorTargets(s.color), dotSize: s.dotSize, tilt: s.tilt, backOpacity: s.backOpacity };
}

export type GlobeKey = keyof ReturnType<typeof globeTargets>;

function lerpPlaced(a: Placed, b: Placed, t: number) {
  b.x = a.x + (b.x - a.x) * t;
  b.y = a.y + (b.y - a.y) * t;
  b.z = a.z + (b.z - a.z) * t;
  b.size = a.size + (b.size - a.size) * t;
  b.dim = a.dim + (b.dim - a.dim) * t;
}

/**
 * Places, tilts, depth-sorts and paints every orb on screen. `placeFor` is called once per orb and
 * returns how to place each of its points; far dots shrink and fade, so only placement varies.
 * While a pattern changes, dots are placed partway between the old orb's motion and the new one's.
 */
export function drawGlobe<S, K extends string, L extends GlobeShape>(
  ctx: CanvasRenderingContext2D,
  { v, layers, size }: Frame<S, K | GlobeKey, L>,
  radius: number,
  placeFor: (shape: L) => (point: GlobePoint, out: Placed) => void,
) {
  const dotSize = Math.max(0, v.dotSize);
  const backOpacity = v.backOpacity;
  const center = size / 2;
  const tiltRad = (v.tilt * Math.PI) / 180;
  const sinT = Math.sin(tiltRad);
  const cosT = Math.cos(tiltRad);

  const placers = new Map<L, (point: GlobePoint, out: Placed) => void>();
  const placerOf = (shape: L) => {
    let place = placers.get(shape);
    if (!place) placers.set(shape, (place = placeFor(shape)));
    return place;
  };
  const scratch: Placed[] = [];
  const toward: Placed = { x: 0, y: 0, z: 0, size: 1, dim: 1 };

  /** Where point `i` shows: its own motion, or partway there from the orb it is morphing in from. */
  const placeAt = (shape: L, i: number, out: Placed, depth = 0) => {
    out.size = out.dim = 1;
    placerOf(shape)(shape.points[i], out);
    const arrival = shape.arrival;
    if (!arrival) return;
    const t = arrival.frozen ?? shape.fade;
    if (t >= 1) return;
    const start = (scratch[depth] ??= { x: 0, y: 0, z: 0, size: 1, dim: 1 });
    placeAt(arrival.from as L, arrival.source[i], start, depth + 1);
    lerpPlaced(start, out, t);
  };

  for (const layer of layers) {
    const { shape } = layer;
    shape.fade = layer.fade;
    // Arrived: let go of the old orb.
    if (shape.arrival && !shape.leaving && shape.fade >= 1) shape.arrival = null;
  }

  ctx.fillStyle = rgb(v);
  for (const { shape, fade } of layers) {
    const { points, placed, order, leaving } = shape;
    // 1 while a leaving orb's unpicked dots are still fully on, down to 0 as they arrive.
    const keep = leaving ? Math.min(1, Math.max(0, fade / leaving.start)) : 1;
    for (let i = 0; i < points.length; i++) {
      const p = placed[i];
      placeAt(shape, i, p);
      if (leaving) {
        if (leaving.kept[i]) p.dim = 0;
        else {
          placeAt(leaving.to as L, leaving.target[i], toward);
          lerpPlaced(p, toward, 1 - keep);
          Object.assign(p, toward);
          p.dim *= keep;
        }
      }
      // Tilt toward the viewer, so the top of the orb shows.
      const { y, z } = p;
      p.y = y * cosT - z * sinT;
      p.z = y * sinT + z * cosT;
    }
    order.sort((i, j) => placed[i].z - placed[j].z);

    const alpha = v.alpha;
    for (const i of order) {
      const p = placed[i];
      if (p.dim <= 0) continue;
      const depth = Math.min(1, Math.max(0, (p.z + 1) / 2)); // 0 = back, 1 = front
      const r = (dotSize / 2) * (BACK_SCALE + (1 - BACK_SCALE) * depth) * p.size;
      ctx.globalAlpha = alpha * (backOpacity + (1 - backOpacity) * depth) * p.dim;
      ctx.beginPath();
      ctx.arc(center + p.x * radius, center - p.y * radius, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
