import { colorTargets, rgb } from "./color";
import { easeInOut, easeOut } from "./ease";
import { FADE_SETTLE, SETTLE } from "./glide";
import type { Scene, Values } from "./loader-canvas";

/** Props every wave row takes. */
export interface WaveSettings {
  bars: number;
  barWidth: number;
  gap: number;
  radius: number;
  minHeight: number;
  maxHeight: number;
  duration: number;
  stagger: number;
  size: number;
  color: string;
  minOpacity: number;
  paused: boolean;
  /** Where the bars grow from: their middle, like a voice meter, or a shared floor, like an equalizer. */
  align?: WaveAlign;
  /** How much has uploaded (0–1); left out, upload loops. Only upload reads it. */
  progress?: number;
  /** Steps in the plan, each a run of bars. Only plan reads it. */
  steps?: number;
  /** The step running now, counting from 0; earlier steps show as done. Only plan reads it. */
  current?: number;
}

/** `center` grows each bar up and down from the middle; `bottom` stands every bar on one floor. */
export type WaveAlign = "center" | "bottom";

/**
 * - `think`: every bar sways on its own blend of slow waves, tallest in the middle, like a voice speaking.
 * - `idle`: the bars breathe together, a little from the middle out, barely rising.
 * - `process`: a steady wave marches left to right through every bar.
 * - `load`: each bar bounces in turn, left to right, then the row rests.
 * - `read`: a small wave scans left to right, lighting bars more than growing them, like eyes down a line.
 * - `write`: bars are typed left to right in bursts of three, each leaving a short mark; then the marks are wiped.
 * - `upload`: bars rise from their floor left to right up to `progress`, the leading bar pulsing; with no
 *   `progress` it fills and drains on a loop.
 * - `edit`: a cursor jumps between spots; the bar there pops and its neighbors ripple.
 * - `plan`: the row is cut into `steps` runs; done steps hold grown, the `current` one sweeps, the rest wait.
 * - `reason`: two waves set off from either end, cross in the middle and carry on, like weighing two sides.
 * - `search`: a narrow head hunts across the row, running ahead and backing up, then hunts its way back.
 * - `ping`: a pulse leaves the middle for both ends, waits, and comes back, like a request and its response.
 */
export type WaveAnimation = "think" | "idle" | "process" | "load" | "read" | "write" | "upload" | "edit" | "plan" | "reason" | "search" | "ping";

export const WAVE_ANIMATIONS: WaveAnimation[] = ["think", "idle", "process", "load", "read", "write", "upload", "edit", "plan", "reason", "search", "ping"];

/** Each animation's own `duration` and `stagger`, in seconds. The single loaders and the group default to these. */
export const WAVE_TIMING: Record<WaveAnimation, { duration: number; stagger: number }> = {
  think: { duration: 2.4, stagger: 0.3 },
  idle: { duration: 2.6, stagger: 0.08 },
  process: { duration: 1.2, stagger: 0.14 },
  load: { duration: 0.42, stagger: 0.1 },
  read: { duration: 0.36, stagger: 0.12 },
  write: { duration: 0.2, stagger: 0.07 },
  upload: { duration: 0.2, stagger: 0.07 },
  edit: { duration: 0.5, stagger: 0.06 },
  plan: { duration: 0.3, stagger: 0.09 },
  reason: { duration: 0.4, stagger: 0.1 },
  search: { duration: 0.3, stagger: 0.09 },
  ping: { duration: 0.3, stagger: 0.07 },
};

/** How each animation spends its growth: `grow` is the share of the full height it reaches, `up` grows from the floor. */
const WAVE_SPEND: Record<WaveAnimation, { grow: number; up: number }> = {
  think: { grow: 1, up: 0 },
  idle: { grow: 1, up: 0 },
  process: { grow: 1, up: 0 },
  load: { grow: 1, up: 0 },
  // Reading lights the bars more than it grows them.
  read: { grow: 0.35, up: 0 },
  write: { grow: 1, up: 0 },
  // An upload rises from the floor, so it reads as going up.
  upload: { grow: 1, up: 1 },
  edit: { grow: 1, up: 0 },
  plan: { grow: 1, up: 0 },
  reason: { grow: 1, up: 0 },
  search: { grow: 1, up: 0 },
  ping: { grow: 1, up: 0 },
};

/** Every number the drawing reads, as the latest props want it. */
export function waveTargets(s: WaveSettings) {
  return {
    ...colorTargets(s.color),
    barWidth: s.barWidth,
    gap: s.gap,
    radius: s.radius,
    minHeight: s.minHeight,
    maxHeight: s.maxHeight,
    duration: s.duration,
    stagger: s.stagger,
    minOpacity: s.minOpacity,
    // 0 grows from the middle, 1 from a shared floor; it glides, so a switch eases the row from one to the other.
    bottom: s.align === "bottom" ? 1 : 0,
    // Whether a progress was given, so leaving it out glides back to the looping upload.
    determinate: s.progress === undefined ? 0 : 1,
    progress: Math.min(1, Math.max(0, s.progress ?? 0)),
    steps: Math.min(8, Math.max(2, s.steps ?? 3)),
    current: Math.max(0, s.current ?? 1),
  };
}

export type WaveKey = keyof ReturnType<typeof waveTargets>;

/** Seconds (roughly) each prop takes to glide: color and opacity fade quickly, geometry and timing take `SETTLE`. */
export const waveSettle: Partial<Record<WaveKey | "size", number>> = {
  red: FADE_SETTLE,
  green: FADE_SETTLE,
  blue: FADE_SETTLE,
  alpha: FADE_SETTLE,
  minOpacity: FADE_SETTLE,
  barWidth: SETTLE,
  gap: SETTLE,
  radius: SETTLE,
  minHeight: SETTLE,
  maxHeight: SETTLE,
  duration: SETTLE,
  stagger: SETTLE,
  bottom: SETTLE,
  determinate: SETTLE,
  progress: SETTLE,
  steps: SETTLE,
  current: SETTLE,
  size: SETTLE,
};

let waveBlend: Partial<Record<WaveKey | `mix_${WaveAnimation}` | "size", number>> | null = null;

/** `waveSettle` plus a blend time for every animation's mix weight, for the group. Built once, then shared. */
export function waveBlendSettle(blend: number) {
  waveBlend ??= { ...waveSettle, ...Object.fromEntries(WAVE_ANIMATIONS.map((a) => [`mix_${a}`, blend])) };
  return waveBlend;
}

/** The bar count, clamped to 3–32. */
function waveCountOf(s: WaveSettings) {
  return Math.min(32, Math.max(3, Math.round(s.bars)));
}

/** A bar count can't be fractional, so a change cross-fades the old row out while the new one fades in. */
export const waveShape = {
  key: (s: WaveSettings) => String(waveCountOf(s)),
  build: waveCountOf,
  settle: FADE_SETTLE,
};

/** How much of each animation is on screen (0–1). Animations left out are off. */
export type WaveMix = Partial<Record<WaveAnimation, number>>;

const WAVE_TAU = Math.PI * 2;
/** Share of a pop spent snapping up; the rest is the bar settling back. */
const WAVE_POP_ATTACK = 0.2;
/** Bars typed in one burst before the pause; three keeps a burst inside the 3–4 units that may move at once. */
const WAVE_WRITE_BURST = 3;
/** How tall a typed bar stays, as a share of its full growth. */
const WAVE_WRITE_INK = 0.35;
/** Where the edit cursor lands each turn, as a share of the row, so it reads as jumping about a file. */
const WAVE_EDIT_SPOTS = [0.3, 0.8, 0.1, 0.6, 0.95, 0.45];
/** Neighbors an edit ripples on each side, and how much of the pop each step out keeps. */
const WAVE_EDIT_REACH = 2;
const WAVE_EDIT_FALLOFF = 0.45;
/** Where the search head stops on its way across and back, as a share of the row: on, back a little, on again. */
const WAVE_SEEK_KEYS = [0, 0.42, 0.28, 0.72, 0.58, 1, 0.6, 0.74, 0.3, 0.44, 0];
/** How grown a finished plan step holds. */
const WAVE_PLAN_DONE = 0.4;
/** How far idle breathing rises, as a share of the full growth. */
const WAVE_IDLE_DEPTH = 0.22;

function waveClamp(t: number) {
  return Math.min(1, Math.max(0, t));
}

/** A raised cosine: a smooth bump with no jolt at rest or at the peak, so a wave reads as one swell. */
function waveSwell(local: number, duration: number) {
  return local >= 0 && local < duration ? 0.5 - 0.5 * Math.cos((WAVE_TAU * local) / duration) : 0;
}

/** Snaps up on the strong ease-out, then settles back on its mirror image, so the fall lingers instead of cutting off. */
function wavePop(u: number) {
  if (u < 0 || u >= 1) return 0;
  return u < WAVE_POP_ATTACK ? easeOut(u / WAVE_POP_ATTACK) : 1 - easeOut((u - WAVE_POP_ATTACK) / (1 - WAVE_POP_ATTACK));
}

/** Seconds the search head spends on one leg between keys: at least two staggers, else its distance in bars. */
function waveSeekLeg(j: number, bars: number, stagger: number) {
  return Math.max(2 * stagger, Math.abs(WAVE_SEEK_KEYS[j + 1] - WAVE_SEEK_KEYS[j]) * (bars - 1) * stagger);
}

/** Seconds each animation's loop takes, so its phase can advance by rate and stay put when timing changes. */
interface WaveCycles {
  think: number;
  idle: number;
  process: number;
  load: number;
  read: number;
  write: number;
  upload: number;
  pulse: number;
  edit: number;
  plan: number;
  reason: number;
  seek: number;
  ping: number;
  /** Seconds from one write burst to the next, and when the wipe starts. Not clocks; the write reads them. */
  writeBurst: number;
  writeWipe: number;
}

type WaveClock = Exclude<keyof WaveCycles, "writeBurst" | "writeWipe">;

const WAVE_CLOCKS: readonly WaveClock[] = ["think", "idle", "process", "load", "read", "write", "upload", "pulse", "edit", "plan", "reason", "seek", "ping"];

/**
 * Fills `out` with each loop's length for `bars` bars. It writes in place, since it runs every frame for every loader
 * on the page and a fresh object each time would only feed the garbage collector.
 */
function waveCyclesInto(out: WaveCycles, bars: number, v: Values<WaveKey>) {
  const stagger = Math.max(0.01, v.stagger);
  const duration = Math.max(0.05, v.duration);
  const sweep = (bars - 1) * stagger;
  let seek = 0;
  for (let j = 0; j < WAVE_SEEK_KEYS.length - 1; j++) seek += waveSeekLeg(j, bars, stagger);
  // A write types bursts of `WAVE_WRITE_BURST` keystrokes `stagger` apart, with a burst-long pause between. Once every
  // bar is typed it holds for a pause, wipes the marks left to right at twice the pace, and pauses again.
  const pause = WAVE_WRITE_BURST * stagger;
  const burst = WAVE_WRITE_BURST * stagger + pause;
  const lastKey = Math.floor((bars - 1) / WAVE_WRITE_BURST) * burst + ((bars - 1) % WAVE_WRITE_BURST) * stagger;
  const wipe = lastKey + duration + pause;
  // The voice blend repeats once a duration; its waves run at whole multiples of it, so the loop is seamless.
  out.think = duration;
  out.idle = duration;
  out.process = duration;
  // Every bar bounces in turn, then the row rests for one bounce.
  out.load = sweep + 2 * duration;
  // The scan runs off the right end, waits a few bars' time, and starts again at the left.
  out.read = sweep + duration + 3 * stagger;
  out.write = wipe + sweep / 2 + duration + pause;
  out.writeBurst = burst;
  out.writeWipe = wipe;
  // A looping upload: fill left to right, hold full for one push, drain in the same order, hold empty for one push.
  out.upload = 2 * (sweep + 2 * duration);
  // The upload's leading bar pulses every four pushes.
  out.pulse = 4 * duration;
  out.edit = WAVE_EDIT_SPOTS.length * (duration + 2 * WAVE_EDIT_REACH * stagger);
  // One sweep through the current step.
  out.plan = (bars / Math.min(8, Math.max(2, v.steps))) * stagger + duration;
  // Both waves cross the row, then it rests for one push.
  out.reason = sweep + 2 * duration;
  out.seek = seek;
  // Out to both ends, wait two pushes, back to the middle, wait two pushes before the next request.
  out.ping = sweep + 6 * duration;
  return out;
}

/**
 * A row of upright bars, counted left to right. Each animation gives every bar a lift (0–1) from its place in the
 * row; `mix` says how much of each animation is on screen. It is read every frame, so a switch glides one
 * animation's lifts into the next.
 */
export function waveScene<S extends WaveSettings, K extends string>(mix: (v: Values<K | WaveKey>) => WaveMix): Scene<S, K | WaveKey, number> {
  // How far through its loop each clock has come (0–1). Advancing by rate keeps the motion in place while the
  // timing or bar count changes, and lets pausing coast to a stop.
  const phase = { think: 0, idle: 0, process: 0, load: 0, read: 0, write: 0, upload: 0, pulse: 0, edit: 0, plan: 0, reason: 0, seek: 0, ping: 0 } satisfies Record<WaveClock, number>;
  // Reused every frame, so a running loader allocates nothing.
  const cycles = { ...phase, writeBurst: 0, writeWipe: 0 } satisfies WaveCycles;
  // The animations on screen this frame, with their weights. Usually one; two while a switch blends.
  const live: WaveAnimation[] = [];
  const liveWeight: number[] = [];

  return {
    advance(dt, { v, settings }) {
      waveCyclesInto(cycles, waveCountOf(settings), v);
      for (const k of WAVE_CLOCKS) phase[k] = (phase[k] + (dt * v.rate) / cycles[k]) % 1;
    },
    draw(ctx, { v, size, layers }) {
      const weights = mix(v);
      live.length = 0;
      liveWeight.length = 0;
      for (const name of WAVE_ANIMATIONS) {
        const w = weights[name] ?? 0;
        if (w <= 0) continue;
        live.push(name);
        liveWeight.push(w);
      }
      if (live.length === 0) return;
      const searching = (weights.search ?? 0) > 0;
      const mid = size / 2;
      const bottom = waveClamp(v.bottom);
      const stagger = Math.max(0.01, v.stagger);
      const minOpacity = v.minOpacity;
      // Leave a pixel round the edge so the tallest bar never touches it.
      const tallest = Math.min(Math.max(1, v.maxHeight), size - 4);
      const rest = Math.min(Math.max(1, v.minHeight), tallest);
      const range = tallest - rest;

      ctx.fillStyle = rgb(v);
      for (const { shape: bars, fade } of layers) {
        // Shrink width and gap together when the row would run past the edges.
        let width = Math.max(0.5, v.barWidth);
        let gap = Math.max(0, v.gap);
        const span = bars * width + (bars - 1) * gap;
        if (span > size - 4) {
          const fit = (size - 4) / span;
          width *= fit;
          gap *= fit;
        }
        const left = mid - (bars * width + (bars - 1) * gap) / 2;
        waveCyclesInto(cycles, bars, v);
        const duration = Math.max(0.05, v.duration);
        const last = bars - 1;
        const center = last / 2;

        const thinkT = phase.think;
        const idleTime = phase.idle * cycles.idle;
        const processT = phase.process;
        const loadTime = phase.load * cycles.load;
        const readTime = phase.read * cycles.read;
        const writeTime = phase.write * cycles.write;
        const uploadTime = phase.upload * cycles.upload;
        const drain = cycles.upload / 2;
        const pulse = waveSwell(phase.pulse * cycles.pulse, duration);
        const filled = waveClamp(v.progress) * bars;
        // Which spot the edit cursor is on, and how long it has been there.
        const editSlot = cycles.edit / WAVE_EDIT_SPOTS.length;
        const editTime = phase.edit * cycles.edit;
        const editTurn = Math.min(WAVE_EDIT_SPOTS.length - 1, Math.floor(editTime / editSlot));
        const editSpot = Math.round(WAVE_EDIT_SPOTS[editTurn] * last);
        const editLocal = editTime - editTurn * editSlot;
        const steps = Math.min(8, Math.max(2, v.steps));
        const planTime = phase.plan * cycles.plan;
        const reasonTime = phase.reason * cycles.reason;
        // The search head eases between keys, since it moves on screen. Only worked out while search is showing:
        // the ease is a curve solve, not worth paying for every other animation.
        let seekLeft = phase.seek * cycles.seek;
        let seekHead = 0;
        for (let j = 0; searching && j < WAVE_SEEK_KEYS.length - 1; j++) {
          const leg = waveSeekLeg(j, bars, stagger);
          if (seekLeft <= leg || j === WAVE_SEEK_KEYS.length - 2) {
            const u = waveClamp(seekLeft / leg);
            seekHead = (WAVE_SEEK_KEYS[j] + (WAVE_SEEK_KEYS[j + 1] - WAVE_SEEK_KEYS[j]) * easeInOut(u)) * last;
            break;
          }
          seekLeft -= leg;
        }
        // The seek's bump is `duration ÷ stagger` bars wide, centered on the head, since it travels both ways.
        const seekWidth = Math.max(1, duration / stagger);
        const pingTime = phase.ping * cycles.ping;
        const half = center * stagger;
        const pingBack = half + 3 * duration;

        for (let i = 0; i < bars; i++) {
          // How far the bar is from the middle of the row (0–1).
          const fromCenter = last > 0 ? Math.abs(i - center) / center : 0;
          let grow = 0;
          let up = 0;
          let glow = 0;
          // How much of the row stands on a floor: the weight of animations that grow upward, lift or not.
          let floor = 0;

          for (let a = 0; a < live.length; a++) {
            const name = live[a];
            const w = liveWeight[a];
            let lift = 0;
            // How lit the bar is, when that differs from how far it grows.
            let light: number | undefined;
            switch (name) {
              case "think": {
                // Three waves at one, two and three times the loop, each offset along the row by its own amount, so
                // no two bars move alike. The middle stands tallest, like the loudest band of a voice.
                const o = (i * stagger) / duration;
                const a = 0.5 + 0.5 * Math.sin(WAVE_TAU * (thinkT + o));
                const b = 0.5 + 0.5 * Math.sin(WAVE_TAU * (2 * thinkT - 2.3 * o + 0.3));
                const c = 0.5 + 0.5 * Math.sin(WAVE_TAU * (3 * thinkT + 3.7 * o + 0.7));
                const taper = 0.55 + 0.45 * Math.cos((Math.PI / 2) * fromCenter);
                // The power pulls quiet moments down, so peaks stand out like syllables.
                lift = taper * (0.1 + 0.9 * (0.5 * a + 0.3 * b + 0.2 * c) ** 1.6);
                break;
              }
              case "idle": {
                // One slow breath, starting a little later toward the ends.
                const local = (((idleTime - Math.abs(i - center) * stagger) % cycles.idle) + cycles.idle) % cycles.idle;
                lift = WAVE_IDLE_DEPTH * (0.5 - 0.5 * Math.cos((WAVE_TAU * local) / cycles.idle));
                light = lift / WAVE_IDLE_DEPTH;
                break;
              }
              case "process":
                lift = 0.5 - 0.5 * Math.cos(WAVE_TAU * (processT - (i * stagger) / duration));
                break;
              case "load":
                lift = waveSwell(loadTime - i * stagger, duration);
                break;
              case "read":
                lift = waveSwell(readTime - i * stagger, duration);
                break;
              case "write": {
                const key = writeTime - (Math.floor(i / WAVE_WRITE_BURST) * cycles.writeBurst + (i % WAVE_WRITE_BURST) * stagger);
                if (key < 0) break;
                // A keystroke pops up on the strong ease-out and settles to its mark; the wipe eases it away.
                const u = key / duration;
                const stroke = u < WAVE_POP_ATTACK ? easeOut(u / WAVE_POP_ATTACK) : 1 - (1 - WAVE_WRITE_INK) * easeOut(waveClamp((u - WAVE_POP_ATTACK) / (1 - WAVE_POP_ATTACK)));
                lift = stroke * (1 - easeOut(waveClamp((writeTime - cycles.writeWipe - (i * stagger) / 2) / duration)));
                break;
              }
              case "upload": {
                // Determinate: full up to the progress, the part-filled leading bar pulsing so it reads as working.
                const part = waveClamp(filled - i);
                const leading = i === Math.floor(filled) ? (1 - part) * pulse : 0;
                const loop = easeOut(waveClamp((uploadTime - i * stagger) / duration)) * (1 - easeOut(waveClamp((uploadTime - drain - i * stagger) / duration)));
                lift = v.determinate * (part + leading) + (1 - v.determinate) * loop;
                break;
              }
              case "edit": {
                // The bar under the cursor pops; each neighbor out pops a beat later and smaller.
                const d = Math.abs(i - editSpot);
                if (d > WAVE_EDIT_REACH) break;
                lift = WAVE_EDIT_FALLOFF ** d * wavePop((editLocal - d * stagger) / duration);
                break;
              }
              case "plan": {
                // Steps glide, so a change of step count slides the run edges rather than jumping them.
                const at = (i * steps) / bars;
                const own = Math.floor(at);
                const into = (at - own) * (bars / steps) * stagger;
                const done = waveClamp(v.current - own);
                const running = waveClamp(1 - Math.abs(v.current - own));
                const sweep = running * waveSwell(planTime - into, duration);
                lift = done * WAVE_PLAN_DONE + sweep;
                light = done + sweep;
                break;
              }
              case "reason": {
                // Two waves from opposite ends; where they cross, they add up to a full push without overshooting.
                const a = waveSwell(reasonTime - i * stagger, duration);
                const b = waveSwell(reasonTime - (last - i) * stagger, duration);
                lift = 1 - (1 - a) * (1 - b);
                break;
              }
              case "search": {
                const d = i - seekHead;
                lift = Math.abs(d) < seekWidth / 2 ? 0.5 + 0.5 * Math.cos((WAVE_TAU * d) / seekWidth) : 0;
                break;
              }
              case "ping": {
                // Steps count out from the middle both ways, so the request reaches both ends and the response comes back.
                const out = Math.abs(i - center) * stagger;
                lift = Math.max(waveSwell(pingTime - out, duration), waveSwell(pingTime - pingBack - (half - out), duration));
                break;
              }
            }
            const spend = WAVE_SPEND[name];
            grow += w * lift * spend.grow * (1 - spend.up);
            up += w * lift * spend.grow * spend.up;
            floor += w * spend.up;
            glow += w * (light ?? lift);
          }

          // A centered bar grows both ways from the middle; growth spent `up` stacks on top so the bar rises from
          // its floor, which sinks by half the range so a fully risen bar is centered too. On a shared floor, every
          // bar stands on the line the tallest bar would reach down to.
          const height = rest + range * (grow + up);
          const centered = Math.max(1, mid - (rest + range * grow) / 2 + (range / 2) * waveClamp(floor) - range * up);
          const floored = mid + tallest / 2 - height;
          const top = centered * (1 - bottom) + floored * bottom;
          const corner = Math.min(Math.max(0, v.radius), width / 2, height / 2);

          ctx.globalAlpha = v.alpha * fade * (minOpacity + (1 - minOpacity) * waveClamp(glow));
          ctx.beginPath();
          ctx.roundRect(left + i * (width + gap), top, width, height, corner);
          ctx.fill();
        }
      }
    },
  };
}
