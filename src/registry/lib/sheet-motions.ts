import { easeInOut, easeOut } from "./ease";
import type { SheetMotion } from "./sheet";

/**
 * Every way a flat dot sheet can move. Each motion turns its props into glide targets and says how
 * much each dot swells over time, so single loaders and the switchable DotSquare / DotCircle agree.
 */

export interface ThinkSettings {
  duration: number;
  gap: number;
  ringWidth: number;
  direction: "out" | "in";
}

/** A ring of swollen dots spreads from the center to the edge (or closes in). */
export const thinkMotion = {
  targets(s: ThinkSettings) {
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
export const loadMotion = {
  targets: thinkMotion.targets,
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

export interface IdleSettings {
  duration: number;
  gap: number;
  ripple: number;
}

/** Every dot grows and shrinks together, with an optional center-to-edge lag. */
export const idleMotion = {
  targets(s: IdleSettings) {
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

export interface ProcessSettings {
  duration: number;
  gap: number;
  spread: number;
  direction: "right" | "left";
}

/** The sheet breathes in a sweep from one side to the other. */
export const processMotion = {
  targets(s: ProcessSettings) {
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

/**
 * Where the plan stops, as shares of the sheet's dots in reading order. Each pass starts from empty and wanders
 * forward or back to each stop in turn; a pass always ends on 1, the full sheet, which clears instead of turning back.
 */
const PLAN_PASSES = [
  [0.35, 0.6, 0.42, 0.78, 1],
  [0.22, 0.5, 0.31, 0.66, 0.88, 1],
  [0.45, 0.27, 0.71, 1],
];
/** Seconds the shortest move takes, so a step of a few dots still reads as a move. */
const PLAN_MIN_MOVE = 0.35;
/** Seconds the plan waits at each stop while the dot it stopped on blinks twice. */
const PLAN_STOP = 0.8;
/** Seconds the full sheet takes to clear from the top row to the bottom, each row's let-go, and the rest after. */
const PLAN_CLEAR = 0.6;
const PLAN_LET_GO = 0.2;
const PLAN_REST = 0.3;
/** How far the next dot to tick breathes while a progress is shown, so a still list still reads as working. */
const PLAN_BLINK = 0.5;

/** Every move in the loop, from where the last one stopped to the next stop, with the pause that follows it. */
function planMoves(duration: number, gap: number) {
  const moves: { from: number; to: number; travel: number; pause: number }[] = [];
  for (const stops of PLAN_PASSES) {
    let from = 0;
    for (const to of stops) {
      // A move takes its share of a full crossing, so the front always runs at the same pace.
      const travel = Math.max(PLAN_MIN_MOVE, Math.abs(to - from) * duration);
      moves.push({ from, to, travel, pause: to >= 1 ? gap + PLAN_CLEAR + PLAN_LET_GO + PLAN_REST : PLAN_STOP });
      from = to;
    }
  }
  return moves;
}

/** Two smooth blinks off and back across 0–1. */
function blinkTwice(x: number) {
  return x <= 0 || x >= 1 ? 0 : bump(((x * 2) % 1) * 2 - 1);
}

/**
 * The checklist ticks forward to a stop somewhere on the sheet, the dot it stopped on blinks, then it carries on
 * forward or steps back to the next stop. When it reaches the end the full sheet holds, clears row by row from the
 * top, and the next pass starts from empty; it never turns back from the end. Given a progress, it shows that
 * many dots ticked instead, the next dot breathing.
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
  cycle: (v) => planMoves(Math.max(0.5, v.duration), Math.max(0, v.gap)).reduce((sum, m) => sum + m.travel + m.pause, 0),
  swell: (t, v) => {
    const gap = Math.max(0, v.gap);
    const moves = planMoves(Math.max(0.5, v.duration), gap);
    const cycle = moves.reduce((sum, m) => sum + m.travel + m.pause, 0);
    const determinate = Math.min(1, Math.max(0, v.determinate));
    const progress = Math.min(1, Math.max(0, v.progress));
    // The next dot breathes twice a loop: a cosine swell, so it never jumps.
    const blink = PLAN_BLINK * (0.5 - 0.5 * Math.cos((4 * Math.PI * t) / cycle));

    // Find the move running now and how far into it we are.
    let at = t;
    let move = moves[moves.length - 1];
    for (const m of moves) {
      if (at < m.travel + m.pause) {
        move = m;
        break;
      }
      at -= m.travel + m.pause;
    }
    const moving = at < move.travel;
    const paused = at - move.travel;

    return ({ row, col, rows }) => {
      let loop = 0;
      if (determinate < 1) {
        const total = rows * rows;
        const index = row * rows + Math.round(col * rows);
        const from = Math.round(move.from * total);
        const to = Math.max(1, Math.round(move.to * total));
        // The front glides between stops with the strong ease-in-out of an on-screen move, counted in dots.
        const front = moving ? from + easeInOut(at / move.travel) * (to - from) : to;
        // Each dot grows in as the front passes it (or shrinks as it backs over it), easing out.
        loop = easeOut(Math.min(1, Math.max(0, front - index)));
        if (!moving) {
          if (to >= total) {
            // The full sheet holds, then each row lets go whole, top to bottom, easing out.
            const clear = gap + (row / rows) * PLAN_CLEAR;
            loop *= 1 - easeOut(Math.min(1, Math.max(0, (paused - clear) / PLAN_LET_GO)));
          } else if (index === to - 1) {
            // The dot the plan stopped on blinks while it waits.
            loop *= 1 - blinkTwice(paused / PLAN_STOP);
          }
        }
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
export const uploadMotion = {
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

export interface SearchSettings {
  duration: number;
}

/** Turns a dot takes to grow as the sweep reaches it, and the turns its trail fades over. */
const RADAR_RISE = 0.04;
const RADAR_TRAIL = 0.3;
/** The center dot is the radar's hub: it holds half swollen while the sweep turns around it. */
const RADAR_HUB = 0.5;

/** A wedge sweeps clockwise around the center at a steady pace, swelling the dots it passes and leaving a fading trail. */
export const searchMotion = {
  targets(s: SearchSettings) {
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
