import { easeInOut, easeOut } from "./ease";
import type { SheetMotion } from "./sheet";

/**
 * Every way a flat dot sheet can move. Each motion turns its props into glide targets and says how
 * much each dot swells over time, so single loaders and the switchable DotSquare / DotCircle agree.
 */

export interface PulseSettings {
  duration: number;
  gap: number;
  ringWidth: number;
  direction: "out" | "in";
}

/** A ring of swollen dots spreads from the center to the edge (or closes in). */
export const pulseMotion = {
  targets(s: PulseSettings) {
    return {
      duration: s.duration,
      gap: s.gap,
      ringWidth: s.ringWidth,
      // 0 spreads out from the center, 1 closes in from the edge; between, the ring flattens across.
      inward: s.direction === "in" ? 1 : 0,
    };
  },
  cycle: (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap),
  swell: (t, v) => {
    const turn = Math.max(0.05, v.duration);
    const width = Math.max(0.05, v.ringWidth);
    const inward = v.inward;
    // The ring starts fully inside the center and ends fully past the edge, so
    // every dot gets one complete swell. During the gap it sits off-sheet.
    const ring = t < turn ? -width + (t / turn) * (1 + 2 * width) : Infinity;
    return ({ d }) => {
      const distance = d + (1 - 2 * d) * inward;
      const x = Math.abs(distance - ring) / width;
      // Cosine bump: 1 at the ring's center line, easing to 0 at its edges.
      return x < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * x) : 0;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "ringWidth" | "inward"> & { targets: unknown };

/** The pulse's ring swells each dot and leaves it swollen until the whole sheet is full, then a second pass shrinks them back in the same order. */
export const fillMotion = {
  targets: pulseMotion.targets,
  cycle: (v) => 2 * Math.max(0.05, v.duration) + Math.max(0, v.gap),
  swell: (t, v) => {
    const turn = Math.max(0.05, v.duration);
    const width = Math.max(0.05, v.ringWidth);
    const inward = v.inward;
    // The front crosses the sheet once to fill it, then again to empty it. During the gap every dot rests.
    const emptying = t >= turn;
    const local = emptying ? t - turn : t;
    const front = local < turn ? -width + (local / turn) * (1 + 2 * width) : -Infinity;
    return ({ d }) => {
      if (front === -Infinity) return 0;
      const distance = d + (1 - 2 * d) * inward;
      // How far the front has passed this dot: 0 not yet reached, 1 fully past. Each dot grows (or shrinks)
      // once and holds, so it takes the strong ease-in-out of an on-screen morph rather than a soft sine.
      const x = Math.min(1, Math.max(0, (front - distance) / width + 0.5));
      const passed = easeInOut(x);
      return emptying ? 1 - passed : passed;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "ringWidth" | "inward"> & { targets: unknown };

export interface BreathSettings {
  duration: number;
  gap: number;
  ripple: number;
}

/** Every dot grows and shrinks together, with an optional center-to-edge lag. */
export const breathMotion = {
  targets(s: BreathSettings) {
    return { duration: s.duration, gap: s.gap, ripple: s.ripple };
  },
  cycle: (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap) + Math.max(0, v.ripple),
  swell: (t, v) => {
    const breath = Math.max(0.05, v.duration);
    const ripple = Math.max(0, v.ripple);
    const cycle = breath + Math.max(0, v.gap) + ripple;
    return ({ d }) => {
      // Each dot runs the same breath, delayed by its distance from the center.
      const local = (((t - d * ripple) % cycle) + cycle) % cycle;
      // One cosine swell 0 → 1 → 0 across the breath, then rest at 0.
      return local < breath ? 0.5 - 0.5 * Math.cos((2 * Math.PI * local) / breath) : 0;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "ripple"> & { targets: unknown };

export interface WaveSettings {
  duration: number;
  gap: number;
  spread: number;
  direction: "right" | "left";
}

/** The sheet breathes in a sweep from one side to the other. */
export const waveMotion = {
  targets(s: WaveSettings) {
    return {
      duration: s.duration,
      gap: s.gap,
      spread: s.spread,
      // 0 travels right, 1 travels left; between, the sweep evens out before turning around.
      leftward: s.direction === "left" ? 1 : 0,
    };
  },
  cycle: (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap) + Math.max(0, v.spread),
  swell: (t, v) => {
    const breath = Math.max(0.05, v.duration);
    const lag = Math.max(0, v.spread);
    const cycle = breath + Math.max(0, v.gap) + lag;
    const leftward = v.leftward;
    return ({ u }) => {
      // Each dot runs the same breath, delayed by how far across the sheet it sits.
      const across = (u + 1) / 2 - u * leftward;
      const local = (((t - across * lag) % cycle) + cycle) % cycle;
      // One cosine swell 0 → 1 → 0 across the breath, then rest at 0.
      return local < breath ? 0.5 - 0.5 * Math.cos((2 * Math.PI * local) / breath) : 0;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "spread" | "leftward"> & { targets: unknown };

/** Cosine bump: 1 where `x` is 0, easing to 0 at ±1 and beyond. */
function bump(x: number) {
  return Math.abs(x) < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * x) : 0;
}

export interface ReadSettings {
  duration: number;
  gap: number;
  trail: number;
}

/** Rows a dot takes to grow once the read head reaches it: about two dots, so the head reads as one point. */
const READ_RISE = 0.2;

/** A read head runs along each row in turn, like eyes across lines of text, leaving a few rows fading behind it. */
export const readMotion = {
  targets(s: ReadSettings) {
    return { duration: s.duration, gap: s.gap, trail: s.trail };
  },
  cycle: (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap),
  swell: (t, v) => {
    const duration = Math.max(0.05, v.duration);
    const trail = Math.max(READ_RISE * 2, v.trail);
    return ({ row, col, rows }) => {
      if (t >= duration) return 0;
      // The head moves at a steady pace (linear), from before the first dot until the trail clears the last row.
      const head = (t / duration) * (rows + trail);
      const age = head - (row + col);
      if (age < 0 || age >= trail) return 0;
      // A dot snaps up as the head arrives (ease-out), then fades softly over the trail.
      if (age < READ_RISE) return easeOut(age / READ_RISE);
      return bump((age - READ_RISE) / (trail - READ_RISE));
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "trail"> & { targets: unknown };

export interface EditSettings {
  duration: number;
  gap: number;
}

/** Each edit's block of rows: where it starts (as a share of the rows it can start on) and how many rows it covers. */
const EDIT_HUNKS = [
  { at: 0.25, size: 3 },
  { at: 0.75, size: 2 },
  { at: 0, size: 2 },
  { at: 0.55, size: 3 },
];
/** Shares of one edit: rows are typed until `WRITE`, held until `HOLD` (the cursor blinks), then let go. */
const EDIT_WRITE = 0.55;
const EDIT_HOLD = 0.82;
/** Seconds one dot takes to grow as it's typed. */
const EDIT_GROW = 0.18;

/**
 * A few whole rows are typed in, dot by dot in reading order, like the changed lines of a diff. The last dot
 * blinks once as a cursor, then the block lets go and the next edit lands somewhere else on the sheet.
 */
export const editMotion = {
  targets(s: EditSettings) {
    return { duration: s.duration, gap: s.gap };
  },
  cycle: (v) => EDIT_HUNKS.length * (Math.max(0.2, v.duration) + Math.max(0, v.gap)),
  swell: (t, v) => {
    const duration = Math.max(0.2, v.duration);
    const slot = duration + Math.max(0, v.gap);
    const hunk = EDIT_HUNKS[Math.min(EDIT_HUNKS.length - 1, Math.floor(t / slot))];
    const local = t - Math.floor(t / slot) * slot;
    const write = duration * EDIT_WRITE;
    const hold = duration * EDIT_HOLD;
    return ({ row, col, rows }) => {
      if (local >= duration) return 0;
      const size = Math.min(hunk.size, rows);
      const start = Math.round(hunk.at * (rows - size));
      const step = row - start + col;
      if (step < 0 || step >= size) return 0;
      // Typed at a steady pace; each dot grows in with an ease-out as the cursor reaches it.
      const typed = easeOut(Math.min(1, Math.max(0, (local - (step / size) * write) / EDIT_GROW)));
      if (local < hold) {
        // The last dot typed is the cursor: one smooth blink off and back while the block holds.
        const last = row === start + size - 1 && col >= (rows - 1) / rows - 1e-6;
        if (!last || local < write) return typed;
        return typed * (1 - bump(((local - write) / (hold - write)) * 2 - 1));
      }
      // The whole block lets go together, easing out.
      return typed * (1 - easeOut((local - hold) / (duration - hold)));
    };
  },
} satisfies SheetMotion<"duration" | "gap"> & { targets: unknown };

export interface PingSettings {
  duration: number;
  wait: number;
  gap: number;
  ringWidth: number;
}

/** How strong the returning echo is, next to the ping that went out. */
const PING_ECHO = 0.7;

/**
 * A ring leaves the center for the edge (the request), the sheet waits, and a fainter echo travels back in to
 * the center (the response). Each leg crosses the sheet on screen, so it takes the strong ease-in-out; its slow
 * start and end fall mostly off the sheet, so what shows is a quick, even crossing.
 */
export const pingMotion = {
  targets(s: PingSettings) {
    return { duration: s.duration, wait: s.wait, gap: s.gap, ringWidth: s.ringWidth };
  },
  cycle: (v) => 2 * Math.max(0.05, v.duration) + Math.max(0, v.wait) + Math.max(0, v.gap),
  swell: (t, v) => {
    const travel = Math.max(0.05, v.duration);
    const width = Math.max(0.05, v.ringWidth);
    const back = travel + Math.max(0, v.wait);
    // Each leg starts fully off one side of the sheet and ends fully off the other, so every dot gets one swell.
    const span = 1 + 2 * width;
    let ring = Infinity;
    let strength = 1;
    if (t < travel) ring = -width + easeInOut(t / travel) * span;
    else if (t >= back && t < back + travel) {
      ring = 1 + width - easeInOut((t - back) / travel) * span;
      strength = PING_ECHO;
    }
    return ({ d }) => (ring === Infinity ? 0 : strength * bump((d - ring) / width));
  },
} satisfies SheetMotion<"duration" | "wait" | "gap" | "ringWidth"> & { targets: unknown };

export interface StreamSettings {
  duration: number;
  trail: number;
}

/** Lines the print takes to cross one row, and a dot takes to grow once printed. A line lands well before the next. */
const STREAM_PRINT = 0.5;
const STREAM_RISE = 1;

/** How far along its row output line `line` reaches (0–1). Fixed per line, so the loop repeats exactly; about one in six is full. */
function streamLength(line: number) {
  const x = Math.sin(line * 12.9898 + 78.233) * 43758.5453;
  return 0.25 + 0.9 * (x - Math.floor(x));
}

/**
 * Output lines of uneven length print row by row from the top, like a terminal. The newest line is brightest and
 * each one steps down as the next lands, so it reads as scrolling while no dot moves. After the last row the
 * lines wrap back to the top; the loop runs two passes, so the line lengths change between them.
 */
export const streamMotion = {
  targets(s: StreamSettings) {
    return { duration: s.duration, trail: s.trail };
  },
  cycle: (v) => 2 * Math.max(0.2, v.duration),
  swell: (t, v) => {
    const duration = Math.max(0.2, v.duration);
    const trail = Math.max(1, v.trail);
    return ({ row, col, rows }) => {
      // Lines land at a steady pace (linear), one per row. `age` is how many lines ago this row's latest one landed.
      const since = (t / duration) * rows - row;
      const age = ((since % rows) + rows) % rows;
      const pass = ((Math.floor(since / rows) % 2) + 2) % 2;
      if (col >= streamLength(row + pass * rows)) return 0;
      // The line prints left to right, each dot snapping up as it's printed (ease-out).
      const printed = age - col * STREAM_PRINT;
      if (printed < 0) return 0;
      const grow = easeOut(Math.min(1, printed / STREAM_RISE));
      if (age < 1) return grow;
      // Each newer line knocks this one down a step, quickly (ease-out), until it's gone after `trail` steps.
      const older = age - 1;
      const level = 1 - (Math.floor(older) + easeOut(older - Math.floor(older))) / trail;
      return grow * Math.max(0, level);
    };
  },
} satisfies SheetMotion<"duration" | "trail"> & { targets: unknown };

export interface PlanSettings {
  duration: number;
  gap: number;
  progress?: number;
}

/** Share of a row's turn its dots take to tick across, left to right. */
const PLAN_SWEEP = 0.6;
/** Seconds one dot takes to grow as it's ticked. */
const PLAN_GROW = 0.2;
/** Seconds the full sheet takes to clear from the top row to the bottom, each row's let-go, and the rest after. */
const PLAN_CLEAR = 0.6;
const PLAN_LET_GO = 0.2;
const PLAN_REST = 0.3;
/** How far the next dot to tick breathes while a progress is shown, so a still list still reads as working. */
const PLAN_BLINK = 0.5;

/**
 * Rows tick off one at a time from the top, like items on a checklist, and stay ticked. Once the whole sheet is
 * full it holds, then clears quickly in the same order, a few rows at a time, and starts again. Given a progress, it shows that many rows ticked instead, the
 * next dot breathing.
 */
export const planMotion = {
  targets(s: PlanSettings) {
    return {
      duration: s.duration,
      gap: s.gap,
      // Whether a progress was given, so leaving it out glides back to the looping checklist.
      determinate: s.progress === undefined ? 0 : 1,
      progress: Math.min(1, Math.max(0, s.progress ?? 0)),
    };
  },
  cycle: (v) => Math.max(0.5, v.duration) + Math.max(0, v.gap) + PLAN_CLEAR + PLAN_LET_GO + PLAN_REST,
  swell: (t, v) => {
    const duration = Math.max(0.5, v.duration);
    const held = duration + Math.max(0, v.gap);
    const cycle = held + PLAN_CLEAR + PLAN_LET_GO + PLAN_REST;
    const determinate = Math.min(1, Math.max(0, v.determinate));
    const progress = Math.min(1, Math.max(0, v.progress));
    // The next dot breathes twice a loop: a cosine swell, so it never jumps.
    const blink = PLAN_BLINK * (0.5 - 0.5 * Math.cos((4 * Math.PI * t) / cycle));
    // Every row gets the same turn, and the last row's dots finish growing as the fill ends.
    const fill = duration - PLAN_GROW;
    return ({ row, col, rows }) => {
      let loop = 0;
      if (determinate < 1) {
        const start = ((row + col * PLAN_SWEEP) / rows) * fill;
        const clear = held + (row / rows) * PLAN_CLEAR;
        // Each dot grows in with an ease-out as its row is ticked, and each row lets go whole, easing out.
        loop = easeOut(Math.min(1, Math.max(0, (t - start) / PLAN_GROW))) * (1 - easeOut(Math.min(1, Math.max(0, (t - clear) / PLAN_LET_GO))));
      }
      let shown = 0;
      if (determinate > 0) {
        // Counted in dots, reading order, so a gliding progress fills its last row left to right.
        const x = progress * rows * rows - (row * rows + Math.round(col * rows));
        const ticked = Math.min(1, Math.max(0, x));
        shown = x >= 0 && x < 1 ? ticked + (1 - ticked) * blink : ticked;
      }
      return determinate * shown + (1 - determinate) * loop;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "determinate" | "progress"> & { targets: unknown };

export interface CircleSettings {
  duration: number;
  gap: number;
}

/** Rings in motion at once while the gather closes in, and how far they swell, so the pop at the center stands out. */
const GATHER_WIDTH = 3.5;
const GATHER_LEVEL = 0.6;
/** Seconds the pop takes to swell and to let go, and how much of it the first ring takes. */
const GATHER_RISE = 0.12;
const GATHER_FALL = 0.35;
const GATHER_SEND = 0.6;

/** A quick swell and let-go, both easing out; `p` is seconds since it started. */
function pop(p: number, rise: number, fall: number) {
  if (p < 0 || p >= rise + fall) return 0;
  return p < rise ? easeOut(p / rise) : 1 - easeOut((p - rise) / fall);
}

/**
 * Rings swell in turn from the edge inward, like things being collected, then the center dot pops once with
 * the first ring, as if the bundle were sent.
 */
export const gatherMotion = {
  targets(s: CircleSettings) {
    return { duration: s.duration, gap: s.gap };
  },
  cycle: (v) => Math.max(0.2, v.duration) + GATHER_RISE + GATHER_FALL + Math.max(0, v.gap),
  swell: (t, v) => {
    const duration = Math.max(0.2, v.duration);
    const half = GATHER_WIDTH / 2;
    const send = pop(t - duration, GATHER_RISE, GATHER_FALL);
    return ({ row, rows }) => {
      if (row === 0) return send;
      // Steps count rings in from the edge. The band closes in at a steady pace (linear) and reaches the
      // center as the gather ends; it keeps going after, so the inner rings finish their swell.
      const head = -half + (t / duration) * (rows - 1 + half);
      const gather = GATHER_LEVEL * bump((head - (rows - 1 - row)) / half);
      return row === 1 ? Math.max(gather, GATHER_SEND * send) : gather;
    };
  },
} satisfies SheetMotion<"duration" | "gap"> & { targets: unknown };

/** The heartbeat's two beats, as shares of `duration` in and how strong each is. */
const AWAIT_BEATS = [
  { at: 0, strength: 1 },
  { at: 0.14, strength: 0.7 },
];
/** Shares of `duration` one beat takes to swell and to let go. */
const AWAIT_RISE = 0.05;
const AWAIT_FALL = 0.14;
/** How softly the first ring echoes each beat, and how far behind the center it follows. */
const AWAIT_RING = 0.35;
const AWAIT_LAG = 0.03;

/** The sheet rests dim while the center dot beats slowly, a double beat like a heartbeat, the first ring echoing it softly. */
export const awaitMotion = {
  targets(s: CircleSettings) {
    return { duration: s.duration, gap: s.gap };
  },
  cycle: (v) => Math.max(0.5, v.duration) + Math.max(0, v.gap),
  swell: (t, v) => {
    const duration = Math.max(0.5, v.duration);
    const beat = (time: number) => {
      let s = 0;
      for (const { at, strength } of AWAIT_BEATS) s = Math.max(s, strength * pop(time - at * duration, AWAIT_RISE * duration, AWAIT_FALL * duration));
      return s;
    };
    const center = beat(t);
    const ring = AWAIT_RING * beat(t - AWAIT_LAG * duration);
    return ({ row }) => (row === 0 ? center : row === 1 ? ring : 0);
  },
} satisfies SheetMotion<"duration" | "gap"> & { targets: unknown };

export interface RadarSettings {
  duration: number;
}

/** Turns a dot takes to grow as the sweep reaches it, and the turns its trail fades over. */
const RADAR_RISE = 0.04;
const RADAR_TRAIL = 0.3;
/** The center dot is the radar's hub: it holds half swollen while the sweep turns around it. */
const RADAR_HUB = 0.5;

/** A wedge sweeps clockwise around the center at a steady pace, swelling the dots it passes and leaving a fading trail. */
export const radarMotion = {
  targets(s: RadarSettings) {
    return { duration: s.duration };
  },
  // One turn per loop, with no rest: the sweep never stops.
  cycle: (v) => Math.max(0.2, v.duration),
  swell: (t, v) => {
    const head = t / Math.max(0.2, v.duration);
    return ({ row, col }) => {
      if (row === 0) return RADAR_HUB;
      // Turns since the sweep passed this dot, by its angle round the ring (constant travel, so linear).
      const age = (((head - col) % 1) + 1) % 1;
      if (age < RADAR_RISE) return easeOut(age / RADAR_RISE);
      return bump((age - RADAR_RISE) / RADAR_TRAIL);
    };
  },
} satisfies SheetMotion<"duration"> & { targets: unknown };
