import { easeInOut, easeInOutCubic, easeOut } from "./ease";
import { BLEND_SETTLE, FADE_SETTLE } from "./glide";
import { drawGlobe } from "./globe";
import type { GlobeKey, GlobePoint, GlobeShape } from "./globe";
import type { Frame, Scene, Values } from "./loader-canvas";

/**
 * Every way a dot sphere can move. Each motion turns its props into glide targets and runs a scene
 * over the shared globe geometry, so single loaders and the switchable DotGlobe draw the same thing.
 */

type GlobeFrame<K extends string> = Frame<unknown, K | GlobeKey, GlobeShape>;

/**
 * The orb's radius, the same for every motion. Where lift is in play (DotProcess, or DotGlobe whatever
 * animation it runs), it leaves room for a ring at the peak of its push, so switching animation never resizes the orb.
 */
function radiusOf({ v, size }: GlobeFrame<never>) {
  const lift = Math.max(0, (v as Partial<Record<"lift", number>>).lift ?? 0);
  return (size / 2 - Math.max(0, v.dotSize)) / (1 + lift);
}

/** Gap (s) at which a spin turn is fully eased; smaller gaps blend toward a linear spin, 0 being linear. */
const SPIN_EASE_GAP = 0.2;
/** Seconds (roughly) a resting row takes to settle back square after a timing change knocked it off. */
const CASCADE_REALIGN = 0.12;
/** Opacity a dot keeps at the deepest point of the tide, so sunken dots read as further inside. */
const TIDE_SUNK_OPACITY = 0.55;

/**
 * Seconds (roughly) each target glides for when its prop changes, shared by DotGlobe and every single
 * sphere; unlisted keys (size, dot size, tilt, lift, depth, width, timing) take `SETTLE`. Color and opacity
 * fade faster, since nothing moves. Direction flips and animation switches blend one motion into the next.
 */
export const globeSettle = {
  red: FADE_SETTLE,
  green: FADE_SETTLE,
  blue: FADE_SETTLE,
  alpha: FADE_SETTLE,
  backOpacity: FADE_SETTLE,
  dir: BLEND_SETTLE,
  from: BLEND_SETTLE,
  mix_think: BLEND_SETTLE,
  mix_ponder: BLEND_SETTLE,
  mix_process: BLEND_SETTLE,
  mix_work: BLEND_SETTLE,
  mix_reason: BLEND_SETTLE,
  mix_read: BLEND_SETTLE,
  mix_transfer: BLEND_SETTLE,
  mix_search: BLEND_SETTLE,
  mix_compact: BLEND_SETTLE,
  mix_parallel: BLEND_SETTLE,
  down: BLEND_SETTLE,
};

/**
 * Which way a motion runs: left / right around the vertical axis (spin, cascade, sweep), or up / down (rise).
 * One type so DotGlobe can share a single `direction` prop; each motion reads the values it knows and
 * treats the rest as its default.
 */
export type GlobeDirection = "left" | "right" | "up" | "down";

/** A loop of one move (`at` runs 0 to 1), then a rest (`rested` seconds), over and over. */
type MoveLoop = { at: number; rested: number };

/**
 * Runs `seconds` through a move-then-rest loop. Progress is kept rather than worked out from a cycle,
 * so changing the timing only changes the speed: a longer gap never jumps a move under way.
 * `moved` hears each stretch of progress, so a spin can add the turns up.
 */
function runMoveLoop(loop: MoveLoop, seconds: number, length: number, gap: number, moved?: (from: number, to: number) => void) {
  // A frame can hold several short moves (a zero gap takes none at all); cap it so nothing spins.
  for (let guard = 0; guard < 16 && seconds > 0; guard++) {
    if (loop.at < 1) {
      const from = loop.at;
      const need = (1 - from) * length;
      loop.at = seconds < need ? from + seconds / length : 1;
      seconds -= Math.min(seconds, need);
      moved?.(from, loop.at);
    } else {
      const need = Math.max(0, gap - loop.rested);
      if (seconds < need) {
        loop.rested += seconds;
        seconds = 0;
      } else {
        seconds -= need;
        loop.at = loop.rested = 0;
      }
    }
  }
}

export interface ThinkSettings {
  duration: number;
  gap: number;
  direction: GlobeDirection;
}

/** The whole orb spins on its vertical axis. */
export const thinkMotion = {
  targets(s: ThinkSettings) {
    return {
      duration: s.duration,
      gap: s.gap,
      // Spin velocity sign; flipping it slows the orb, stops it, and spins it back up the other way.
      dir: s.direction === "right" ? -1 : 1,
    };
  },
  scene(): Scene<unknown, "duration" | "gap" | "dir" | GlobeKey, GlobeShape> {
    // One turn, then a rest for `gap`; advanced by rate so pausing coasts to a stop.
    const loop: MoveLoop = { at: 0, rested: 0 };
    let angle = 0;

    return {
      advance(dt, { v }) {
        const gap = Math.max(0, v.gap);
        // With no gap the spin is linear so consecutive turns join seamlessly; a gap eases each turn in and out.
        // easeInOutCubic, not the stronger easeInOut: a whole turn at its peak already sweeps more than a dot
        // spacing a frame, and a faster middle strobes the lattice.
        const ease = Math.min(1, gap / SPIN_EASE_GAP);
        const turned = (x: number) => x + (easeInOutCubic(x) - x) * ease;
        runMoveLoop(loop, dt * v.rate, Math.max(0.05, v.duration), gap, (from, to) => {
          angle = (angle + (turned(to) - turned(from)) * Math.PI * 2 * v.dir) % (Math.PI * 2);
        });
      },
      draw(ctx, frame) {
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        drawGlobe(ctx, frame, radiusOf(frame), () => ({ x, y, z }, out) => {
          // Spin around the vertical axis.
          out.x = x * cosA + z * sinA;
          out.y = y;
          out.z = -x * sinA + z * cosA;
        });
      },
    };
  },
};

export interface PonderSettings {
  duration: number;
  stagger: number;
  gap: number;
  direction: GlobeDirection;
}

/** The orb holds still while each row takes a full turn, one after another from the top. */
export const ponderMotion = {
  targets(s: PonderSettings) {
    return {
      duration: s.duration,
      stagger: s.stagger,
      gap: s.gap,
      // Spin velocity sign; flipping it slows turning rows, stops them, and turns them back the other way.
      dir: s.direction === "right" ? -1 : 1,
    };
  },
  scene(): Scene<unknown, "duration" | "stagger" | "gap" | "dir" | GlobeKey, GlobeShape> {
    // Seconds into the current wave, advanced by rate so pausing coasts to a stop. Kept in seconds, not as
    // a fraction of the cycle, so a gap change never shifts the rows mid-turn.
    let now = 0;

    return {
      advance(dt, { v, layers: onScreen }) {
        const shapes = onScreen.map((layer) => layer.shape);
        const turn = Math.max(0.05, v.duration);
        const stagger = Math.max(0, v.stagger);
        // Sized for the tallest orb on screen, so a fading-out orb's rows still finish their turn.
        const cycle = Math.max(...shapes.map((shape) => shape.rows)) * stagger + turn + Math.max(0, v.gap);
        const settle = 1 - Math.exp(-dt / CASCADE_REALIGN);
        const from = now;
        const to = now + dt * v.rate;

        // Each row runs one eased 360° turn, starting `stagger` seconds after the row above. easeInOutCubic,
        // not the stronger easeInOut, for the same reason as spin: a faster middle strobes the turning row.
        const progress = (time: number, l: number) => {
          const whole = Math.floor(time / cycle);
          return whole + Math.min(1, Math.max(0, (time - whole * cycle - l * stagger) / turn));
        };
        const turnsAt = (time: number, l: number) => {
          const x = progress(time, l);
          const whole = Math.floor(x);
          return whole + easeInOutCubic(x - whole);
        };

        for (const shape of shapes) {
          for (let l = 0; l <= shape.rows; l++) {
            let a = shape.rowAngles[l] + (turnsAt(to, l) - turnsAt(from, l)) * Math.PI * 2 * v.dir;
            a %= Math.PI * 2;
            const x = progress(to, l) % 1;
            // A row at rest belongs square to the orb; ease it back if a timing change left it skewed.
            if (x === 0) a -= (a - Math.PI * 2 * Math.round(a / (Math.PI * 2))) * settle;
            shape.rowAngles[l] = a;
            shape.rowSin[l] = Math.sin(a);
            shape.rowCos[l] = Math.cos(a);
          }
        }
        now = to % cycle;
      },
      draw(ctx, frame) {
        drawGlobe(ctx, frame, radiusOf(frame), ({ rowSin, rowCos }) => ({ x, y, z, row }, out) => {
          const sinA = rowSin[row];
          const cosA = rowCos[row];
          // Spin the row around the vertical axis.
          out.x = x * cosA + z * sinA;
          out.y = y;
          out.z = -x * sinA + z * cosA;
        });
      },
    };
  },
};

export interface ProcessSettings {
  lift: number;
  duration: number;
  stagger: number;
  gap: number;
  from: "top" | "bottom";
}

/** The orb holds still while each ring pushes outward and settles back, one after another. */
export const processMotion = {
  targets(s: ProcessSettings) {
    return {
      lift: s.lift,
      duration: s.duration,
      stagger: s.stagger,
      gap: s.gap,
      // 0 runs the wave top to bottom, 1 bottom to top; gliding between them re-routes it smoothly.
      from: s.from === "bottom" ? 1 : 0,
    };
  },
  scene(): Scene<unknown, "lift" | "duration" | "stagger" | "gap" | "from" | GlobeKey, GlobeShape> {
    type F = GlobeFrame<"lift" | "duration" | "stagger" | "gap" | "from">;
    // Seconds into the current wave, advanced by rate so pausing coasts to a stop. Kept in seconds, not as
    // a fraction of the cycle, so a gap change never moves the rings mid-push.
    let now = 0;

    /** Seconds from the first ring leaving to the last one setting off, sized for the tallest orb on screen. */
    const spanOf = ({ v, layers }: F) => Math.max(...layers.map((layer) => layer.shape.steps)) * Math.max(0, v.stagger);
    const cycleOf = (frame: F) => spanOf(frame) + Math.max(0.05, frame.v.duration) + Math.max(0, frame.v.gap);

    return {
      advance(dt, frame) {
        now = (now + dt * frame.v.rate) % cycleOf(frame);
      },
      draw(ctx, frame) {
        const { v } = frame;
        const lift = Math.max(0, v.lift);
        const fromBottom = v.from;
        const turn = Math.max(0.05, v.duration);
        const stagger = Math.max(0, v.stagger);
        const span = spanOf(frame);
        drawGlobe(ctx, frame, radiusOf(frame), ({ steps }) => {
          // A shorter orb (fading out mid-change) starts later so both finish together.
          const lead = span - steps * stagger;
          return ({ x, y, z, step }, out) => {
            const d = step + (steps - 2 * step) * fromBottom;
            const t = Math.min(1, Math.max(0, (now - lead - d * stagger) / turn));
            // Push out and settle back on a sine bump: starts and lands at rest, no snap at either end.
            const s = 1 + lift * Math.sin(Math.PI * t) ** 2;
            // Only x and z scale: each ring widens or narrows around the vertical axis and never leaves its height.
            out.x = x * s;
            out.y = y;
            out.z = z * s;
          };
        });
      },
    };
  },
};

export interface WorkSettings {
  depth: number;
  width: number;
  duration: number;
  gap: number;
  from: "top" | "bottom";
}

/** A narrow wave travels down the orb, pulling a few rows inward as it passes. */
export const workMotion = {
  targets(s: WorkSettings) {
    return {
      depth: s.depth,
      width: s.width,
      duration: s.duration,
      gap: s.gap,
      // 0 runs the wave top to bottom, 1 bottom to top; gliding between them turns the tide smoothly.
      from: s.from === "bottom" ? 1 : 0,
    };
  },
  scene(): Scene<unknown, "depth" | "width" | "duration" | "gap" | "from" | GlobeKey, GlobeShape> {
    // One sweep, then a rest for `gap`; advanced by rate so pausing coasts to a stop. The sweep keeps its
    // progress, so a duration change only changes the wave's speed and never jumps it along the orb.
    const loop: MoveLoop = { at: 0, rested: 0 };

    return {
      advance(dt, { v }) {
        runMoveLoop(loop, dt * v.rate, Math.max(0.05, v.duration), Math.max(0, v.gap));
      },
      draw(ctx, frame) {
        const { v } = frame;
        const sink = Math.min(0.9, Math.max(0, v.depth));
        const half = Math.max(0.5, v.width) / 2;
        const fromBottom = v.from;
        // How far the wave has travelled this sweep (0–1), at a constant speed; it holds at 1 through the gap, past the far pole.
        const travel = loop.at;

        drawGlobe(ctx, frame, radiusOf(frame), ({ steps }) => {
          // The wave's middle, in steps; it starts and ends fully off the orb so it enters and leaves softly.
          const mid = -half + travel * (steps + half * 2);
          return ({ x, y, z, step }, out) => {
            const d = step + (steps - 2 * step) * fromBottom;
            // 1 at the middle of the wave, easing to 0 `half` steps either side, so only a few rows move at once.
            const dist = Math.abs(d - mid) / half;
            const w = dist < 1 ? Math.cos((Math.PI / 2) * dist) ** 2 : 0;
            const s = 1 - sink * w;
            // Only x and z scale: each ring narrows toward the vertical axis and never leaves its height.
            out.x = x * s;
            out.y = y;
            out.z = z * s;
            // Pulled-in dots shrink and dim, so the wave reads as passing inside the orb.
            out.size = s;
            out.dim = 1 - (1 - TIDE_SUNK_OPACITY) * w * Math.min(1, sink * 4);
          };
        });
      },
    };
  },
};

export interface ReasonSettings {
  moves: number;
  duration: number;
  gap: number;
}

/** One cube turn: a third of the orb turning about the vertical axis (a row) or the horizontal one (a column). */
type Turn = { id: number; axis: "row" | "column"; layer: -1 | 0 | 1; sign: 1 | -1 };

/** Where each dot of one orb sits while it is being twisted, in the orb's own turning frame. */
interface TwistState {
  /** The pattern itself; a solved orb sits exactly here. */
  base: Float64Array;
  /** Where each dot sits between turns. */
  pos: Float64Array;
  /** Each dot's turn about the vertical axis: a quarter, snapped so the turn lands it back on the pattern. */
  quarter: Float64Array;
  /** A column's turn over the top: a half turn, or a whole one where a half would land between the dots. */
  flip: number;
  /** Where a layer starts: dots further than this from the middle along the turn's axis are in an outer layer. */
  edge: number;
  index: Map<GlobePoint, number>;
  /** 1 for the dots in the turn under way. */
  turning: Uint8Array;
  /** Scramble turns this orb took, so a solve undoes only those (an orb that morphed in midway took fewer). */
  taken: Set<number>;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/**
 * How far past a layer's edge a dot must sit to count as in the outer layer. The edge can fall exactly on
 * a ring's dots; without slack, rounding would put one dot of a mirrored pair in the layer and not the other.
 */
const EDGE_SLACK = 1e-7;

/** The nearest whole number of `n`ths of a circle to a quarter turn, at least one. */
function snappedQuarter(n: number) {
  return ((Math.PI * 2) / n) * Math.max(1, Math.round(n / 4));
}

function buildTwist(shape: GlobeShape): TwistState {
  const { points, rows, pattern } = shape;
  const count = points.length;
  const cols = rows * 2;
  // The spiral is symmetric under a half turn about one horizontal axis, which swaps dot i with dot count-1-i.
  // Spinning the orb so that axis is the column axis makes every column flip land the spiral back on itself.
  const frame = pattern === "fibonacci" ? (((count - 1) * GOLDEN) / 2) % Math.PI : 0;
  const sinF = Math.sin(frame);
  const cosF = Math.cos(frame);

  const base = new Float64Array(count * 3);
  const quarter = new Float64Array(count);
  points.forEach(({ x, y, z, row }, i) => {
    base[i * 3] = x * cosF + z * sinF;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = -x * sinF + z * cosF;
    // No turn about the vertical axis lands the spiral back on itself, so its rows go all the way round.
    if (pattern === "fibonacci") quarter[i] = Math.PI * 2;
    else if (pattern === "grid") quarter[i] = snappedQuarter(cols);
    else {
      // Each ring turns by its own nearest quarter of its dot spacing, so it lands on its own dots. A column
      // flip only ever swaps ring i with ring rows-i, which has as many dots, so this never changes for a dot.
      const r = Math.cos(Math.PI / 2 - (row / rows) * Math.PI);
      quarter[i] = row === 0 || row === rows ? Math.PI / 2 : snappedQuarter(Math.max(1, Math.round(cols * r)));
    }
  });

  // Thirds of the orb, like a 3×3 cube, with the cut halfway between two rows so no ring is ever split.
  const cut = Math.round(rows / 3 - 0.5) + 0.5;
  return {
    base,
    pos: base.slice(),
    quarter,
    // A half turn swaps ring i with ring rows-i; with an odd row count their dots sit half a step apart.
    flip: pattern === "rings" && rows % 2 === 1 ? Math.PI * 2 : Math.PI,
    edge: Math.cos((cut / rows) * Math.PI),
    index: new Map(points.map((p, i) => [p, i])),
    turning: new Uint8Array(count),
    taken: new Set(),
  };
}

/** Rotates dot `i` of `pos` by `angle` for `turn`, into `out`. */
function rotateDot(pos: Float64Array, i: number, turn: Turn, angle: number, out: { x: number; y: number; z: number }) {
  const x = pos[i * 3];
  const y = pos[i * 3 + 1];
  const z = pos[i * 3 + 2];
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  if (turn.axis === "row") {
    out.x = x * cosA + z * sinA;
    out.y = y;
    out.z = -x * sinA + z * cosA;
  } else {
    out.x = x;
    out.y = y * cosA - z * sinA;
    out.z = y * sinA + z * cosA;
  }
}

/**
 * The orb scrambles and solves itself like a twisty cube. Each turn spins a third of it, a row about the
 * vertical axis or a column over the top; after `moves` turns the same turns play back in reverse.
 */
export const reasonMotion = {
  targets(s: ReasonSettings) {
    return { moves: s.moves, duration: s.duration, gap: s.gap };
  },
  scene(): Scene<unknown, "moves" | "duration" | "gap" | GlobeKey, GlobeShape> {
    type V = Values<"moves" | "duration" | "gap" | GlobeKey>;
    const states = new WeakMap<GlobeShape, TwistState>();
    const stateOf = (shape: GlobeShape) => {
      let state = states.get(shape);
      if (!state) states.set(shape, (state = buildTwist(shape)));
      return state;
    };

    let scramble: Turn[] = [];
    let nextId = 0;
    // The loop runs scramble turns, a hold, the solve (the scramble undone, last turn first), then a rest.
    let stage: "scramble" | "hold" | "solve" | "rest" = "rest";
    let at = 0;
    // Progress through the current turn or pause (0–1), advanced by rate so pausing coasts to a stop.
    let t = 1;

    const current = (): Turn | null => {
      if (stage === "scramble") return scramble[at];
      if (stage === "solve") {
        const turn = scramble[scramble.length - 1 - at];
        return { ...turn, sign: turn.sign === 1 ? -1 : 1 };
      }
      return null;
    };

    const newScramble = (v: V) => {
      const out: Turn[] = [];
      for (let k = 0; k < Math.max(1, Math.round(v.moves)); k++) {
        const prev = out[k - 1];
        let turn: Turn;
        // Never the same layer twice in a row, or the two turns would read as one.
        do {
          turn = {
            id: nextId++,
            axis: Math.random() < 0.5 ? "row" : "column",
            layer: (Math.floor(Math.random() * 3) - 1) as Turn["layer"],
            sign: Math.random() < 0.5 ? 1 : -1,
          };
        } while (prev && prev.axis === turn.axis && prev.layer === turn.layer);
        out.push(turn);
      }
      return out;
    };

    /** Picks the dots in `turn`'s layer, on every orb that took part in it. */
    const begin = (turn: Turn, shapes: GlobeShape[]) => {
      for (const shape of shapes) {
        const state = stateOf(shape);
        const { pos, turning, edge, taken } = state;
        turning.fill(0);
        if (stage === "solve" && !taken.has(turn.id)) continue;
        const offset = turn.axis === "row" ? 1 : 0;
        for (let i = 0; i < turning.length; i++) {
          const c = pos[i * 3 + offset];
          const layer = c > edge + EDGE_SLACK ? 1 : c < -edge - EDGE_SLACK ? -1 : 0;
          if (layer === turn.layer) turning[i] = 1;
        }
      }
    };

    /** Settles every turning dot where the turn left it. */
    const commit = (turn: Turn, shapes: GlobeShape[]) => {
      const out = { x: 0, y: 0, z: 0 };
      for (const shape of shapes) {
        const state = stateOf(shape);
        const { pos, turning, quarter, flip, taken } = state;
        let moved = false;
        for (let i = 0; i < turning.length; i++) {
          if (!turning[i]) continue;
          moved = true;
          rotateDot(pos, i, turn, (turn.axis === "row" ? quarter[i] : flip) * turn.sign, out);
          pos[i * 3] = out.x;
          pos[i * 3 + 1] = out.y;
          pos[i * 3 + 2] = out.z;
        }
        turning.fill(0);
        if (!moved) continue;
        if (stage === "scramble") taken.add(turn.id);
        else taken.delete(turn.id);
        // Solved: snap exactly back onto the pattern so rounding never builds up.
        if (stage === "solve" && taken.size === 0) pos.set(state.base);
      }
    };

    /** Seconds the current stage's step lasts. */
    const lengthOf = (v: V) => (stage === "hold" || stage === "rest" ? Math.max(0, v.gap) : Math.max(0.05, v.duration));

    /** Moves on from a finished step to the next one. */
    const finish = (v: V, shapes: GlobeShape[]) => {
      const turn = current();
      if (turn) commit(turn, shapes);
      t = 0;
      if (stage === "scramble" && ++at >= scramble.length) [stage, at] = ["hold", 0];
      else if (stage === "hold") [stage, at] = ["solve", 0];
      else if (stage === "solve" && ++at >= scramble.length) [stage, at] = ["rest", 0];
      else if (stage === "rest") [stage, at, scramble] = ["scramble", 0, newScramble(v)];
      const next = current();
      if (next) begin(next, shapes);
    };

    let turnNow: Turn | null = null;

    return {
      advance(dt, { v, layers }) {
        const shapes = layers.map((layer) => layer.shape);
        let left = dt * v.rate;
        // Several short steps can pass in one frame (a zero gap takes none at all); cap it so nothing spins.
        for (let guard = 0; guard < 64 && (left > 0 || t >= 1); guard++) {
          if (t >= 1) {
            finish(v, shapes);
            continue;
          }
          const length = lengthOf(v);
          const need = (1 - t) * length;
          if (left < need) {
            t += left / length;
            left = 0;
          } else {
            left -= need;
            t = 1;
          }
        }
        turnNow = current();
      },
      draw(ctx, frame) {
        const turn = turnNow;
        // A cube turn is a part moving across the orb and landing: strong ease-in-out, so it sets off
        // decisively and settles softly onto the pattern.
        const eased = turn ? easeInOut(Math.min(1, t)) : 0;
        // The shared radius, so in DotGlobe switching to twist never resizes the orb.
        drawGlobe(ctx, frame, radiusOf(frame), (shape) => {
          const { pos, turning, quarter, flip, index } = stateOf(shape);
          // Drawn in the turning frame, so columns always flip about the screen's horizontal axis.
          return (point, placed) => {
            const i = index.get(point) ?? 0;
            if (turn && turning[i]) {
              rotateDot(pos, i, turn, (turn.axis === "row" ? quarter[i] : flip) * turn.sign * eased, placed);
            } else {
              placed.x = pos[i * 3];
              placed.y = pos[i * 3 + 1];
              placed.z = pos[i * 3 + 2];
            }
          };
        });
      },
    };
  },
};

/** 1 at a wave's middle `mid`, easing to 0 `half` steps either side: how much of the wave step `d` is in. */
function waveAt(d: number, mid: number, half: number) {
  const dist = Math.abs(d - mid) / half;
  return dist < 1 ? Math.cos((Math.PI / 2) * dist) ** 2 : 0;
}

/** Rows the scan band lights at once: a line or two, like the line being read. */
const SCAN_WIDTH = 1.75;
/** Opacity of the dots the scan isn't on, so the lit band stands out like the line being read. */
const SCAN_REST_OPACITY = 0.5;
/** How much bigger a dot draws at the middle of the scan band. */
const SCAN_SWELL = 0.35;

export interface ReadSettings {
  duration: number;
  gap: number;
}

/** A thin band of light reads down the orb at a steady pace, brightening and swelling the dots it is on. */
export const readMotion = {
  targets(s: ReadSettings) {
    return { duration: s.duration, gap: s.gap };
  },
  scene(): Scene<unknown, "duration" | "gap" | GlobeKey, GlobeShape> {
    // One read down the orb, then a rest for `gap`; kept as progress, like the tide, so a duration change only changes the pace.
    const loop: MoveLoop = { at: 0, rested: 0 };

    return {
      advance(dt, { v }) {
        runMoveLoop(loop, dt * v.rate, Math.max(0.05, v.duration), Math.max(0, v.gap));
      },
      draw(ctx, frame) {
        const half = SCAN_WIDTH / 2;
        // Linear: a read moves at a constant pace. It holds at 1 through the gap, past the bottom pole.
        const travel = loop.at;
        drawGlobe(ctx, frame, radiusOf(frame), ({ steps }) => {
          const mid = -half + travel * (steps + half * 2);
          return ({ x, y, z, step }, out) => {
            const w = waveAt(step, mid, half);
            // Nothing moves: the band only lights and swells the dots it passes.
            out.x = x;
            out.y = y;
            out.z = z;
            out.size = 1 + SCAN_SWELL * w;
            out.dim = SCAN_REST_OPACITY + (1 - SCAN_REST_OPACITY) * w;
          };
        });
      },
    };
  },
};

/** Opacity a dot keeps as the upload wave carries it off the top pole, so the wave reads as sent. */
const RISE_SENT_OPACITY = 0.3;

export interface TransferSettings {
  lift: number;
  depth: number;
  width: number;
  duration: number;
  gap: number;
  direction: GlobeDirection;
}

/**
 * Up (upload): a wave travels up the orb pushing a few rows outward, fading them as it passes the top pole.
 * Down (download): it travels down pulling them inward, like the tide.
 */
export const transferMotion = {
  targets(s: TransferSettings) {
    return {
      lift: s.lift,
      depth: s.depth,
      width: s.width,
      duration: s.duration,
      gap: s.gap,
      // 0 runs the upload, 1 the download; gliding between them turns the wave and swaps push for pull smoothly.
      down: s.direction === "down" ? 1 : 0,
    };
  },
  scene(): Scene<unknown, "lift" | "depth" | "width" | "duration" | "gap" | "down" | GlobeKey, GlobeShape> {
    // One sweep, then a rest for `gap`, kept as progress like the tide.
    const loop: MoveLoop = { at: 0, rested: 0 };

    return {
      advance(dt, { v }) {
        runMoveLoop(loop, dt * v.rate, Math.max(0.05, v.duration), Math.max(0, v.gap));
      },
      draw(ctx, frame) {
        const { v } = frame;
        const push = Math.max(0, v.lift);
        const sink = Math.min(0.9, Math.max(0, v.depth));
        const half = Math.max(0.5, v.width) / 2;
        const down = v.down;
        // Linear: a transfer moves at a constant pace. It holds at 1 through the gap, past the far pole.
        const travel = loop.at;

        drawGlobe(ctx, frame, radiusOf(frame), ({ steps }) => {
          const mid = -half + travel * (steps + half * 2);
          return ({ x, y, z, step }, out) => {
            // Steps from the pole the wave sets off from: the bottom for an upload, the top for a download.
            const d = step + (steps - 2 * step) * (1 - down);
            const w = waveAt(d, mid, half);
            const s = 1 + (push * (1 - down) - sink * down) * w;
            // Only x and z scale: each ring widens or narrows around the vertical axis and never leaves its height.
            out.x = x * s;
            out.y = y;
            out.z = z * s;
            // An upload fades its dots the nearer the top they are carried, so the wave reads as sent off the orb;
            // a download's pulled-in dots shrink and dim like the tide's.
            const sent = (1 - RISE_SENT_OPACITY) * w * (d / steps) ** 2;
            const sunk = (1 - TIDE_SUNK_OPACITY) * w * Math.min(1, sink * 4);
            out.size = 1 - sink * w * down;
            out.dim = 1 - sent * (1 - down) - sunk * down;
          };
        });
      },
    };
  },
};

/** Columns the sweep's trail fades over behind its head, so 3–4 columns are lit at once. */
const SWEEP_TRAIL = 3;
/** Columns ahead of the head a dot starts to light, so a column never switches on in a single frame. */
const SWEEP_LEAD = 0.5;
/** Opacity of the dots the sweep isn't on. */
const SWEEP_REST_OPACITY = 0.45;
/** How much bigger a dot draws at the sweep's head. */
const SWEEP_SWELL = 0.3;

/**
 * How far around the vertical axis a point sits, in turns, in the pattern's own order. Rings and grid take
 * the point's angle, so a grid column shares one value; the spiral reads it off the step, so a line of
 * equal value winds down the arms like the spiral's stripe.
 */
function aroundOf({ pattern, steps, rows }: GlobeShape, { x, z, step }: GlobePoint) {
  if (pattern === "fibonacci") return step / (steps - rows);
  return Math.atan2(z, x) / (Math.PI * 2);
}

export interface SearchSettings {
  duration: number;
  direction: GlobeDirection;
}

/** One column lights up and sweeps around the orb like a radar, with a short fading trail. The dots never move. */
export const searchMotion = {
  targets(s: SearchSettings) {
    return {
      duration: s.duration,
      // Sweep velocity sign, as spin's; flipping it slows the head, stops it, and sends it back the other way.
      dir: s.direction === "right" ? -1 : 1,
    };
  },
  scene(): Scene<unknown, "duration" | "dir" | GlobeKey, GlobeShape> {
    // Where the head is, in turns around the orb, advanced by rate so pausing coasts to a stop.
    let head = 0;

    return {
      advance(dt, { v }) {
        // A radar turns at a constant pace with no rest: one turn every `duration`, linear.
        head = (((head - (dt * v.rate * v.dir) / Math.max(0.05, v.duration)) % 1) + 1) % 1;
      },
      draw(ctx, frame) {
        const { v } = frame;
        // How much of the trail sits on each side of the head; mid-flip both show, so the trail never jumps sides.
        const left = Math.min(1, Math.max(0, (1 + v.dir) / 2));
        drawGlobe(ctx, frame, radiusOf(frame), (shape) => {
          const cols = shape.rows * 2;
          /** 1 at the head, fading over the trail behind it; `behind` is in turns, measured the way the head came from. */
          const lit = (behind: number) => {
            const c = (((behind % 1) + 1) % 1) * cols;
            if (c <= SWEEP_TRAIL) return 1 - c / SWEEP_TRAIL;
            return Math.max(0, 1 - (cols - c) / SWEEP_LEAD);
          };
          return (point, out) => {
            const a = aroundOf(shape, point);
            // Turning left the head runs toward smaller angles, so the dots it has passed sit at larger ones.
            const w = lit(a - head) * left + lit(head - a) * (1 - left);
            out.x = point.x;
            out.y = point.y;
            out.z = point.z;
            out.size = 1 + SWEEP_SWELL * w;
            out.dim = SWEEP_REST_OPACITY + (1 - SWEEP_REST_OPACITY) * w;
          };
        });
      },
    };
  },
};

/** Rows each compacting wave pulls in, so the two together keep about 4 rows moving. */
const COMPACT_WIDTH = 2;
/** Share of each loop the waves take to travel from the poles to the equator. */
const COMPACT_SQUEEZE = 0.7;
/** Share of each loop the waist holds, pulled in, once the waves meet. The rest lets it go. */
const COMPACT_HOLD = 0.15;

export interface CompactSettings {
  depth: number;
  duration: number;
  gap: number;
}

/** Two waves pull rows inward from the poles and meet at the equator, hold there as a thin waist, then let go. */
export const compactMotion = {
  targets(s: CompactSettings) {
    return { depth: s.depth, duration: s.duration, gap: s.gap };
  },
  scene(): Scene<unknown, "depth" | "duration" | "gap" | GlobeKey, GlobeShape> {
    // Squeeze, hold and release as one move, then a rest for `gap`, kept as progress like the tide.
    const loop: MoveLoop = { at: 0, rested: 0 };

    return {
      advance(dt, { v }) {
        runMoveLoop(loop, dt * v.rate, Math.max(0.05, v.duration), Math.max(0, v.gap));
      },
      draw(ctx, frame) {
        const half = COMPACT_WIDTH / 2;
        const at = loop.at;
        // The waves move across the orb and settle where they meet: strong ease-in-out. The release is the
        // waist leaving: ease-out, so it lets go at once and settles softly.
        const squeeze = easeInOut(Math.min(1, at / COMPACT_SQUEEZE));
        const release = easeOut(Math.max(0, (at - COMPACT_SQUEEZE - COMPACT_HOLD) / (1 - COMPACT_SQUEEZE - COMPACT_HOLD)));
        const sink = Math.min(0.9, Math.max(0, frame.v.depth)) * (1 - release);

        drawGlobe(ctx, frame, radiusOf(frame), ({ steps }) => {
          // Each wave's middle, in steps from its own pole; both start just off the orb and stop at the equator.
          const mid = -half + squeeze * (steps / 2 + half);
          return ({ x, y, z, step }, out) => {
            // Steps from the nearer pole, so the two waves mirror each other and overlap into one waist.
            const w = waveAt(Math.min(step, steps - step), mid, half);
            const s = 1 - sink * w;
            // Only x and z scale: each ring narrows toward the vertical axis and never leaves its height.
            out.x = x * s;
            out.y = y;
            out.z = z * s;
            // Pulled-in dots shrink and dim like the tide's, so the waist reads as drawn inside the orb.
            out.size = s;
            out.dim = 1 - (1 - TIDE_SUNK_OPACITY) * w * Math.min(1, sink * 4);
          };
        });
      },
    };
  },
};

/** Rows each swarm wave moves at once: narrow, so several waves still read as separate bands. */
const SWARM_WIDTH = 1.5;
/** Most waves a swarm runs; each one is a call running alongside the others. */
const SWARM_MAX = 4;

export interface ParallelSettings {
  waves: number;
  lift: number;
  depth: number;
  duration: number;
}

/**
 * Several narrow waves travel down the orb at once, evenly spaced, like that many tides running side by side.
 * Waves take turns pulling their rows inward and pushing them outward, so neighboring waves read apart.
 */
export const parallelMotion = {
  targets(s: ParallelSettings) {
    return { waves: Math.min(SWARM_MAX, Math.max(1, Math.round(s.waves))), lift: s.lift, depth: s.depth, duration: s.duration };
  },
  scene(): Scene<unknown, "waves" | "lift" | "depth" | "duration" | GlobeKey, GlobeShape> {
    // How far the first wave has travelled (0–1), at a constant pace with no rest: the waves behind it keep the orb busy.
    let travel = 0;

    return {
      advance(dt, { v }) {
        travel = (travel + (dt * v.rate) / Math.max(0.05, v.duration)) % 1;
      },
      draw(ctx, frame) {
        const { v } = frame;
        const push = Math.max(0, v.lift);
        const sink = Math.min(0.9, Math.max(0, v.depth));
        const half = SWARM_WIDTH / 2;
        // Glides, so a change of count slides the waves to their new spacing and fades the extra one in or out.
        const count = Math.min(SWARM_MAX, Math.max(1, v.waves));

        drawGlobe(ctx, frame, radiusOf(frame), ({ steps }) => {
          const span = steps + half * 2;
          const mids: number[] = [];
          for (let k = 0; k < Math.ceil(count); k++) mids.push(-half + ((travel + k / count) % 1) * span);
          return ({ x, y, z, step }, out) => {
            let s = 1;
            let sunk = 0;
            for (let k = 0; k < mids.length; k++) {
              const w = waveAt(step, mids[k], half) * Math.min(1, count - k);
              if (k % 2) s += push * w;
              else {
                s -= sink * w;
                sunk += w;
              }
            }
            // Only x and z scale: each ring widens or narrows around the vertical axis and never leaves its height.
            out.x = x * s;
            out.y = y;
            out.z = z * s;
            // Pulled-in dots shrink and dim like the tide's.
            out.size = Math.min(1, s);
            out.dim = 1 - (1 - TIDE_SUNK_OPACITY) * Math.min(1, sunk) * Math.min(1, sink * 4);
          };
        });
      },
    };
  },
};
