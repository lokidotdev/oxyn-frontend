import { colorTargets, rgb } from "./color";
import { easeInOut, easeInOutCubic, easeOut } from "./ease";
import { BLEND_SETTLE, FADE_SETTLE, SETTLE, START_SETTLE, STOP_SETTLE } from "./glide";
import type { Scene, Values } from "./loader-canvas";
import type { MixKey } from "./mix";

/**
 * - `load`: every ring turns steadily.
 * - `work`: each arc's head runs ahead and its tail catches up, so arcs stretch and shrink as they turn.
 * - `plan`: each ring turns exactly one arc, then holds; the step starts at the outer ring and works inward.
 * - `assemble`: the cuts close until a ring is whole, then reopen, one ring after another going inward.
 * - `process`: a ring pulls inward and lets go, the pull travelling from the outer ring to the inner one.
 * - `run`: rings turn at whole-number speed ratios (1:2:3…), so the cuts line up on a regular beat.
 * - `think`: rings turn steadily and each arc fades from a bright head to a faint tail.
 * - `search`: rings click round by whole arcs in different amounts, like a lock trying combinations, then turn
 *   so every cut lines up, glow while they hold, and fall back to rest.
 * - `write`: each arc draws itself on from its tail, holds, then erases from its tail, one ring after another going
 *   inward; each pass writes one arc further on.
 * - `parallel`: each ring is a running call turning at its own pace, surging and easing off; rings past `active`
 *   (counting inward from the outer ring) close their cuts, dim and stop.
 * - `transfer`: the outer ring lights clockwise from 12 o'clock up to `progress` over a faint track while the inner
 *   rings turn slowly; with no `progress` it fills and empties on a loop.
 */
export type ArcAnimation = "load" | "work" | "plan" | "assemble" | "process" | "run" | "think" | "search" | "write" | "parallel" | "transfer";

export const ARC_ANIMATIONS: ArcAnimation[] = ["load", "work", "plan", "assemble", "process", "run", "think", "search", "write", "parallel", "transfer"];

/** Props every arc ring takes. */
export interface ArcSettings {
  lines: number;
  cuts: number;
  cutSpacing: number;
  lineSpacing: number;
  lineWidth: number;
  speed: number;
  alternate: boolean;
  size: number;
  color: string;
  minOpacity: number;
  paused: boolean;
  /** Calls still running (0–6), counting inward from the outer ring; left out, all run. Only tasks reads it. */
  active?: number;
  /** How much has transferred (0–1); left out, progress fills and empties on a loop. Only transfer reads it. */
  progress?: number;
}

/** Every number the drawing reads, as the latest props want it. */
export function arcTargets(s: ArcSettings) {
  return {
    ...colorTargets(s.color),
    lines: Math.min(6, Math.max(1, Math.round(s.lines))),
    cutSpacing: s.cutSpacing,
    lineSpacing: s.lineSpacing,
    lineWidth: s.lineWidth,
    speed: s.speed,
    // 1 = every ring spins the same way, -1 = neighbors counter-rotate. Gliding through 0 eases the switch.
    direction: s.alternate ? -1 : 1,
    minOpacity: s.minOpacity,
    // Fractional while gliding: the ring at the edge closes or reopens part of the way.
    active: Math.min(6, Math.max(0, s.active ?? 6)),
    // Whether a progress was given, so leaving it out glides back to the looping fill.
    determinate: s.progress === undefined ? 0 : 1,
    progress: clamp01(s.progress ?? 0),
  };
}

export type ArcKey = keyof ReturnType<typeof arcTargets>;

/** Seconds (roughly) each prop takes to glide: color and opacity fade quickly, geometry takes `SETTLE`. */
export const arcSettle: Partial<Record<ArcKey | "size", number>> = {
  red: FADE_SETTLE,
  green: FADE_SETTLE,
  blue: FADE_SETTLE,
  alpha: FADE_SETTLE,
  minOpacity: FADE_SETTLE,
  // A ring count change fades the ring past the whole count in or out where it stands: nothing moves.
  lines: FADE_SETTLE,
  cutSpacing: SETTLE,
  lineSpacing: SETTLE,
  lineWidth: SETTLE,
  size: SETTLE,
  // Speed is the clock's pace, so it eases like pausing does instead of lurching.
  speed: STOP_SETTLE,
  // Reversing is a stop and a start: the counter-rotating rings slow down, halt and wind back up the other way.
  direction: START_SETTLE,
  // A finished call coasts to a stop as its ring closes, like pausing.
  active: STOP_SETTLE,
  determinate: SETTLE,
  progress: SETTLE,
};

/** `arcSettle` plus the animation switch, for Arc Rings: one motion morphs into the next. */
export const arcMixSettle: Partial<Record<ArcKey | MixKey<ArcAnimation> | "size", number>> = {
  ...arcSettle,
  mix_load: BLEND_SETTLE,
  mix_work: BLEND_SETTLE,
  mix_plan: BLEND_SETTLE,
  mix_assemble: BLEND_SETTLE,
  mix_process: BLEND_SETTLE,
  mix_run: BLEND_SETTLE,
  mix_think: BLEND_SETTLE,
  mix_search: BLEND_SETTLE,
  mix_write: BLEND_SETTLE,
  mix_parallel: BLEND_SETTLE,
  mix_transfer: BLEND_SETTLE,
};

/** The cut count, clamped to 1–8. */
function arcCutsOf(s: ArcSettings) {
  return Math.min(8, Math.max(1, Math.round(s.cuts)));
}

/** A cut count can't be fractional, so a change cross-fades the old arcs out while the new ones fade in. */
export const arcShape = {
  key: (s: ArcSettings) => String(arcCutsOf(s)),
  build: arcCutsOf,
  settle: FADE_SETTLE,
};

/** How much of each animation is on screen. The weights are blended, so a switch morphs the arcs. */
export type ArcMotion = Record<ArcAnimation, number>;

/** Only `name` on screen. */
export function soloArc(name: ArcAnimation): ArcMotion {
  const out = {} as ArcMotion;
  for (const a of ARC_ANIMATIONS) out[a] = a === name ? 1 : 0;
  return out;
}

const TAU = Math.PI * 2;
/**
 * The clock wraps after this many turns. Every animation repeats exactly within it (up to a whole arc),
 * so the wrap never shows.
 */
const PERIOD = 2;
/** Shortest a chasing arc gets, as a share of its full length. */
const CHASE_MIN = 0.12;
/** How far a comet's tail fades: 0 keeps the arc solid, 1 fades the tail out completely. */
const COMET_FADE = 0.88;
/**
 * Arcs each ring turns on each try, by ring (repeating past six). Every ring moves on every try and no two
 * neighbors move alike, so the tries read as guesses; the rings then turn back by the sum to line up.
 */
const UNLOCK_TRIES = [
  [1, -1, 2, 1, -2],
  [-2, 1, 1, -1, 2],
  [1, 2, -1, 2, 1],
  [-1, -1, 2, -2, 1],
  [2, 1, -2, 1, -1],
  [-1, 2, 1, -1, -2],
];
/**
 * When each try starts, in turns into the `PERIOD` (one every ~830ms at the default speed); then the line-up,
 * held ~1.5s, and the fall back to rest, which lands just before the loop wraps.
 */
const UNLOCK_AT = [0, 0.25, 0.5, 0.75, 1];
const UNLOCK_ALIGN = 1.25;
const UNLOCK_RELEASE = 1.7;
/** Turns one ring takes to make a try (~330ms at the default speed), and to line up or fall back (~470ms). */
const UNLOCK_TRY = 0.1;
const UNLOCK_SETTLE = 0.14;
/** Turns between one ring starting and the ring inside it (~130ms at the default speed). */
const UNLOCK_STAGGER = 0.04;
/** Writes per turn: three each `PERIOD`, one every ~2.2s at the default speed. */
const WRITE_RATE = 1.5;
/**
 * Shares of a write: drawing an arc on (or erasing it) takes 0.2 (~440ms at the default speed) and the erase starts
 * at 0.55. Each ring starts 0.06 (~130ms) after the ring outside it, so 3–4 rings are moving at once.
 */
const WRITE_DRAW = 0.2;
const WRITE_ERASE = 0.55;
const WRITE_STAGGER = 0.06;
/**
 * Each call's pace in turns per turn, by ring (repeating past six). Whole halves, so every ring has turned whole
 * turns when its clock wraps at `PERIOD`; neighbors differ so the calls read as independent.
 */
const TASK_PACE = [1, 1.5, 0.5, 1, 1.5, 0.5];
/** Surges each call's pace makes per `PERIOD`, by ring; whole numbers, so the surges repeat within it. */
const TASK_BEAT = [2, 3, 4, 3, 2, 4];
/** How far a call's pace swings either side of its own, as a share of it. Under 1, so no call ever runs backward. */
const TASK_SURGE = 0.6;
/** How much a finished call's ring dims: 0.35 drops it to about two-thirds of its resting opacity. */
const TASK_DIM = 0.35;
/** Opacity of the unlit track, as a share of the lit arcs'. */
const PROGRESS_TRACK = 0.22;
/**
 * The looping fill, in turns: the outer ring fills over 0.4 (~1.3s at the default speed), holds, and empties
 * from 0.5 the same way, once a turn.
 */
const PROGRESS_SWEEP = 0.4;
const PROGRESS_EMPTY = 0.5;

/** Where a ring's arcs sit in one animation. Animations are blended by mixing these. */
interface Pose {
  /** How far the first arc's middle has turned from the ring's resting offset, in radians, before direction. */
  turn: number;
  /** Length of every arc, in radians. */
  len: number;
  /** Radius change in px; negative pulls the ring inward. */
  dr: number;
  /** 0 = the ring's resting opacity, 1 = fully opaque. */
  glow: number;
  /** How much the arc fades from head to tail (0–1). */
  tail: number;
  /** 0 = the ring's opacity, 1 = dimmed by `TASK_DIM`. */
  dim: number;
  /** The lit stretch of the ring, as shares of a turn clockwise from 12 o'clock; outside it the arcs are faint. */
  litFrom: number;
  litTo: number;
}

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

function frac(t: number) {
  return t - Math.floor(t);
}

/**
 * Adds to the path the pieces of the arc [from, from + len] that fall inside the window [at, at + span] (or outside
 * it, with `inside` false). Angles are in radians; `len` and `span` are at most a turn.
 */
function arcPart(ctx: CanvasRenderingContext2D, center: number, radius: number, from: number, len: number, at: number, span: number, inside: boolean) {
  const a = (((from - at) % TAU) + TAU) % TAU;
  // The arc can run past a whole turn from the window's start, so the window is checked a turn on as well.
  const windows = inside
    ? [
        [0, span],
        [TAU, TAU + span],
      ]
    : [
        [span, TAU],
        [TAU + span, 2 * TAU],
      ];
  for (const [lo, hi] of windows) {
    const s = Math.max(a, lo);
    const e = Math.min(a + len, hi);
    if (e <= s) continue;
    ctx.moveTo(center + Math.cos(at + s) * radius, center + Math.sin(at + s) * radius);
    ctx.arc(center, center, radius, at + s, at + e);
  }
}

/** 0 → 1 → 0 over the first `width` of each cycle, resting at 0 for the rest. */
function bump(t: number, width: number) {
  const u = frac(t) / width;
  return u < 1 ? 0.5 - 0.5 * Math.cos(TAU * u) : 0;
}

/**
 * Concentric rings, counted inward from the outer edge, each split into `cuts` equal arcs (the shape, so a cut
 * change cross-fades). `motion` says how much of each animation is on screen; it is read every frame, so a switch
 * can glide.
 */
export function arcScene<S extends ArcSettings, K extends string>(motion: (v: Values<K | ArcKey>) => ArcMotion): Scene<S, K | ArcKey, number> {
  let turns = 0;
  // Each running call keeps its own clock, so a finished one can stop where it is and pick up there if it reopens.
  const taskClocks = TASK_PACE.map(() => 0);
  const pose: Pose = { turn: 0, len: 0, dr: 0, glow: 0, tail: 0, dim: 0, litFrom: 0, litTo: 0 };
  const turnOf = ARC_ANIMATIONS.map(() => 0);
  // A ring looks the same turned by a whole arc, so each animation's turn can drop whole arcs (`shifts`, per ring)
  // to start a switch within half an arc of the one on screen, and a reversal can turn about the nearest half arc
  // (`pivots`) instead of about 0, which is up to two turns away. Both are re-picked only while nothing is
  // blending, where changing them doesn't show; mid-blend they hold, so nothing jumps.
  const shifts: number[][] = [];
  const pivots: number[] = [];

  /** True when one animation is fully on screen and the rings' direction has settled. */
  const steadyAt = (v: Values<K | ArcKey>) => {
    if (Math.abs(v.direction) !== 1) return false;
    const mix = motion(v);
    const on = ARC_ANIMATIONS.filter((name) => mix[name] > 0);
    return on.length === 1 && mix[on[0]] === 1;
  };

  return {
    advance(dt, { v }) {
      turns += dt * v.speed * v.rate;
      const steady = steadyAt(v);
      // Every turn jumps by whole arcs at the wrap, which only hides when nothing is blending.
      if (steady) turns %= PERIOD;
      for (let j = 0; j < taskClocks.length; j++) {
        taskClocks[j] += dt * v.speed * v.rate * (1 - clamp01(j + 1 - v.active));
        if (steady) taskClocks[j] %= PERIOD;
      }
    },
    draw(ctx, { v, size, layers }) {
      const lineWidth = Math.max(0, v.lineWidth);
      const spacing = Math.max(0, v.lineSpacing);
      const minOpacity = v.minOpacity;
      // Fractional while gliding: the ring past the whole count fades in or out.
      const count = Math.max(1, v.lines);
      const center = size / 2;
      const outer = Math.max(1, center - lineWidth);
      const color = rgb(v);

      const mix = motion(v);
      const weights = ARC_ANIMATIONS.map((name) => Math.max(0, mix[name]));
      const total = weights.reduce((a, b) => a + b, 0) || 1;
      const steady = steadyAt(v);
      const active = weights.indexOf(Math.max(...weights));

      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";

      for (let l = 0; l < layers.length; l++) {
        const { shape: cuts, fade: layerFade } = layers[l];
        // Only the newest layer re-picks shifts and pivots; the one fading out reuses them.
        const newest = l === layers.length - 1;
        const segment = TAU / cuts;
        const cut = Math.min(segment, (Math.max(0, v.cutSpacing) * Math.PI) / 180);

        for (let j = 0; j < Math.ceil(count); j++) {
          const restRadius = outer - j * spacing;
          if (restRadius <= lineWidth / 2) break;
          const presence = Math.min(1, count - j);
          const k = Math.max(0, 1 - j / Math.max(1, count - 1)); // 1 = outer, 0 = innermost
          const spin = j % 2 === 0 ? 1 : v.direction;
          // Round caps reach past the arc's ends, so pull them back to keep the cut its real width.
          const cap = lineWidth / 2 / restRadius;
          // The arc length that leaves exactly `cut` between neighbors, and the longest before caps touch.
          const full = Math.max(0, segment - cut - 2 * cap);
          const closed = Math.max(0, segment - 2 * cap);
          // Each ring starts half a segment on from its neighbor, so the cuts don't line up.
          const offset = j * (segment / 2) - Math.PI / 2;

          pose.turn = pose.len = pose.dr = pose.glow = pose.tail = pose.dim = pose.litFrom = pose.litTo = 0;
          for (let a = 0; a < ARC_ANIMATIONS.length; a++) {
            const w = weights[a] / total;
            let turn = turns * TAU;
            let len = full;
            let dr = 0;
            let glow = 0;
            let tail = 0;
            let dim = 0;
            let litFrom = 0;
            let litTo = 1;

            switch (ARC_ANIMATIONS[a]) {
              case "work": {
                // Two cycles a turn. The head runs out in the first half, the tail catches up in the second;
                // a slow drift makes each cycle move the arcs on exactly one segment, so the loop is seamless.
                // easeInOutCubic rather than the stronger easeInOut: head and tail hand over at rest while the
                // drift keeps going, and a stronger curve stalls that hand-over into a stutter.
                const x = turns * 2 - j * 0.08;
                const n = Math.floor(x);
                const u = x - n;
                const min = full * CHASE_MIN;
                const run = full - min;
                const head = min + run * easeInOutCubic(clamp01(u / 0.5));
                const back = run * easeInOutCubic(clamp01((u - 0.5) / 0.5));
                const drift = (segment - run) * u;
                len = head - back;
                turn = n * segment + drift + (head + back) / 2 - full / 2;
                break;
              }
              case "plan": {
                // Two steps a turn. Each ring takes 40% of a cycle to move one arc, starting 12% after the ring
                // outside it, so 3–4 rings are moving at once. The strong ease-in-out makes each step a dial's
                // click: a quick turn that settles firmly onto the next arc.
                const x = turns * 2 - j * 0.12;
                const n = Math.floor(x);
                const move = clamp01((x - n) / 0.4);
                turn = (n + easeInOut(move)) * segment;
                glow = Math.sin(Math.PI * move);
                break;
              }
              case "assemble": {
                // One wave a turn, travelling inward; the rings drift at half the spin speed.
                const g = bump(turns - j * 0.15, 0.5);
                turn = turns * TAU * 0.5;
                len = full + (closed - full) * g;
                glow = g;
                break;
              }
              case "process": {
                const pull = bump(turns - j * 0.12, 0.4);
                turn = turns * TAU * 0.5;
                dr = -Math.min(spacing * 0.6, restRadius * 0.5) * pull;
                glow = pull;
                break;
              }
              case "run": {
                // Ring j turns (j + 1) half-turns for every half-turn of the outer ring. Taking the ring's offset
                // back out leaves no offset between them, so every ring's cuts line up again whenever the outer
                // ring has turned a whole number of arcs ÷ 2.
                turn = turns * TAU * 0.5 * (j + 1) - j * (segment / 2);
                break;
              }
              case "think":
                tail = 1;
                break;
              case "search": {
                // Every move is a whole number of arcs, except the line-up and the fall back, which are each half an
                // arc times the ring index: that cancels the half-arc offset between neighbors, so the cuts align.
                // Each move takes the strong ease-in-out of a dial clicking from one stop onto the next.
                const u = ((turns % PERIOD) + PERIOD) % PERIOD - j * UNLOCK_STAGGER;
                const moves = UNLOCK_TRIES[j % UNLOCK_TRIES.length];
                const sum = moves.reduce((a, b) => a + b, 0);
                const moveAt = (at: number, span: number) => clamp01((u - at) / span);
                let arcs = 0;
                let moving = 0;
                for (let i = 0; i < moves.length; i++) {
                  const m = moveAt(UNLOCK_AT[i], UNLOCK_TRY);
                  arcs += moves[i] * easeInOut(m);
                  moving = Math.max(moving, Math.sin(Math.PI * m));
                }
                const align = moveAt(UNLOCK_ALIGN, UNLOCK_SETTLE);
                const release = moveAt(UNLOCK_RELEASE, UNLOCK_SETTLE);
                arcs += (-sum - j / 2) * easeInOut(align) + (j / 2) * easeInOut(release);
                turn = arcs * segment;
                // A click glows a little; once lined up the rings glow fully until they fall back.
                glow = Math.max(moving * 0.5, easeInOut(align) * (1 - easeInOut(release)));
                break;
              }
              case "write": {
                // The tail holds while the head draws the arc on, then the head holds while the tail erases it. Both
                // are arriving and leaving, so they take the strong ease-out. Each write sits one arc further on,
                // landing on the pattern; the empty arc slides across the cut between writes, where nothing shows.
                const x = turns * WRITE_RATE - j * WRITE_STAGGER;
                const n = Math.floor(x);
                const u = x - n;
                const drawn = easeOut(clamp01(u / WRITE_DRAW));
                const erased = easeOut(clamp01((u - WRITE_ERASE) / WRITE_DRAW));
                const across = clamp01((u - WRITE_ERASE - WRITE_DRAW) / (1 - WRITE_ERASE - WRITE_DRAW));
                len = full * (drawn - erased);
                turn = n * segment - full / 2 + full * erased + len / 2 + (segment - full) * across;
                break;
              }
              case "parallel": {
                // The ring's own clock stops as its call finishes, so the turn holds; the pace surges on its own beat.
                const c = taskClocks[j % taskClocks.length];
                const pace = TASK_PACE[j % TASK_PACE.length];
                const beat = (TAU * TASK_BEAT[j % TASK_BEAT.length]) / PERIOD;
                const done = clamp01(j + 1 - v.active);
                turn = TAU * pace * (c + (TASK_SURGE / beat) * Math.sin(beat * c));
                len = full + (closed - full) * done;
                dim = done;
                break;
              }
              case "transfer": {
                // The outer ring holds with a cut at 12 o'clock so the fill starts there; the inner rings drift at half
                // the spin speed. The loop fills and empties with the ease-in-out of something moving on screen.
                if (j > 0) {
                  turn = turns * TAU * 0.5;
                  break;
                }
                turn = segment / 2;
                const u = frac(turns);
                const loopTo = easeInOut(clamp01(u / PROGRESS_SWEEP));
                const loopFrom = easeInOut(clamp01((u - PROGRESS_EMPTY) / PROGRESS_SWEEP));
                litFrom = (1 - v.determinate) * loopFrom;
                litTo = v.determinate * v.progress + (1 - v.determinate) * loopTo;
                break;
              }
            }

            turnOf[a] = turn;
            if (w <= 0) continue;
            pose.len += len * w;
            pose.dr += dr * w;
            pose.glow += glow * w;
            pose.tail += tail * w;
            pose.dim += dim * w;
            pose.litFrom += litFrom * w;
            pose.litTo += litTo * w;
          }

          const shift = (shifts[j] ??= ARC_ANIMATIONS.map(() => 0));
          if (steady && newest) for (let a = 0; a < ARC_ANIMATIONS.length; a++) shift[a] = Math.round((turnOf[a] - turnOf[active]) / segment);
          for (let a = 0; a < ARC_ANIMATIONS.length; a++) {
            if (weights[a] > 0) pose.turn += (turnOf[a] - shift[a] * segment) * (weights[a] / total);
          }
          if (steady && newest) pivots[j] = Math.round(pose.turn / (segment / 2));
          // At a whole direction this is offset ± turn, give or take whole arcs; between, the ring slows through 0.
          const pivot = (pivots[j] ?? 0) * (segment / 2);
          const rot = offset + spin * (pose.turn - pivot) + pivot;

          const radius = Math.max(lineWidth / 2, restRadius + pose.dr);
          const len = Math.max(0, Math.min(closed, pose.len));
          const rest = minOpacity + (1 - minOpacity) * k;
          const opacity = (rest + (1 - rest) * clamp01(pose.glow)) * (1 - TASK_DIM * clamp01(pose.dim));
          const alpha = v.alpha * layerFade * presence * opacity;

          // An arc that fills its whole segment is drawn as a plain circle, so the caps don't stack up.
          const whole = len >= closed - 1e-4 && cut <= 1e-4;
          const start = rot - len / 2;
          // The tail shrinks as a reversing ring slows and grows back as it speeds up the other way.
          const fade = COMET_FADE * clamp01(pose.tail) * Math.min(1, Math.abs(spin));

          if (fade > 1e-3 && !whole && len > 0) {
            // A conic gradient per ring, repeating each segment: faint at the tail, full at the head.
            // The head leads the way the ring turns, so a counter-rotating ring has it at the start.
            const gradient = ctx.createConicGradient(start - cap, center, center);
            const lead = spin >= 0;
            const faint = `rgb(${v.red} ${v.green} ${v.blue} / ${1 - fade})`;
            const span = (len + 2 * cap) / segment;
            for (let i = 0; i < cuts; i++) {
              const from = i / cuts;
              const to = from + span / cuts;
              gradient.addColorStop(from, lead ? faint : color);
              gradient.addColorStop(Math.min(1, to), lead ? color : faint);
              if (to < 1) gradient.addColorStop(Math.min(1, to + 1e-4), faint);
            }
            ctx.strokeStyle = gradient;
          } else {
            ctx.strokeStyle = color;
          }

          const litAt = -Math.PI / 2 + clamp01(pose.litFrom) * TAU;
          const litSpan = clamp01(pose.litTo - clamp01(pose.litFrom)) * TAU;
          if (litSpan >= TAU - 1e-4) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            if (whole) {
              ctx.arc(center, center, radius, 0, TAU);
            } else if (len > 0) {
              for (let i = 0; i < cuts; i++) {
                const from = start + i * segment;
                ctx.moveTo(center + Math.cos(from) * radius, center + Math.sin(from) * radius);
                ctx.arc(center, center, radius, from, from + len);
              }
            }
            ctx.stroke();
          } else if (len > 0) {
            // Part of the ring is lit: the arcs are split at the window's edges, lit pieces first, then the faint track.
            for (const inside of [true, false]) {
              ctx.globalAlpha = inside ? alpha : alpha * PROGRESS_TRACK;
              ctx.beginPath();
              if (whole) arcPart(ctx, center, radius, start, TAU, litAt, litSpan, inside);
              else for (let i = 0; i < cuts; i++) arcPart(ctx, center, radius, start + i * segment, len, litAt, litSpan, inside);
              ctx.stroke();
            }
          }
        }
      }
    },
  };
}
