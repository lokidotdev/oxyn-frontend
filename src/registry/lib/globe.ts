import { colorTargets, rgb } from "./color";
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

export type GlobeShape = ReturnType<typeof buildGlobe>;

/** The sphere's points, plus scratch space for projecting and depth-sorting them each frame. */
export function buildGlobe(s: GlobeSettings) {
  const rows = rowsOf(s);
  const { points, steps } = buildPoints(s.pattern, rows);
  return {
    points,
    rows,
    /** The last step on the orb, so a sweep from step 0 to `steps` crosses all of it. */
    steps,
    placed: points.map((): Placed => ({ x: 0, y: 0, z: 0, size: 1, dim: 1 })),
    order: points.map((_, i) => i),
  };
}

/** Identifies an orb's geometry; a pattern or density change cross-fades the old orb out while the new one fades in. */
export function globeKey(s: GlobeSettings) {
  return `${s.pattern}:${rowsOf(s)}`;
}

export const globeShape = { key: globeKey, build: buildGlobe };

/** The globe's own glide targets; spread these into a component's targets. */
export function globeTargets(s: GlobeSettings) {
  return { ...colorTargets(s.color), dotSize: s.dotSize, tilt: s.tilt, backOpacity: s.backOpacity };
}

type GlobeKey = keyof ReturnType<typeof globeTargets>;

/**
 * Places, tilts, depth-sorts and paints every orb on screen. `placeFor` is called once per orb and
 * returns how to place each of its points; far dots shrink and fade, so only placement varies.
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

  ctx.fillStyle = rgb(v);
  for (const { shape, fade } of layers) {
    const { points, placed, order } = shape;
    const place = placeFor(shape);
    for (let i = 0; i < points.length; i++) {
      const p = placed[i];
      p.size = p.dim = 1;
      place(points[i], p);
      // Tilt toward the viewer, so the top of the orb shows.
      const { y, z } = p;
      p.y = y * cosT - z * sinT;
      p.z = y * sinT + z * cosT;
    }
    order.sort((i, j) => placed[i].z - placed[j].z);

    const alpha = v.alpha * fade;
    for (const i of order) {
      const p = placed[i];
      const depth = Math.min(1, Math.max(0, (p.z + 1) / 2)); // 0 = back, 1 = front
      const r = (dotSize / 2) * (BACK_SCALE + (1 - BACK_SCALE) * depth) * p.size;
      ctx.globalAlpha = alpha * (backOpacity + (1 - backOpacity) * depth) * p.dim;
      ctx.beginPath();
      ctx.arc(center + p.x * radius, center - p.y * radius, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
