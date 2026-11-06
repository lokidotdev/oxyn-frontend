import { colorTargets, rgb } from "./color";
import { easeInOut, easeOut } from "./ease";
import { FADE_SETTLE, SETTLE } from "./glide";
import type { Scene, Values } from "./loader-canvas";

/** Props every bar ring takes. */
export interface BarSettings {
  bars: number;
  barHeight: number;
  barWidth: number;
  radius: number;
  extend: number;
  duration: number;
  stagger: number;
  size: number;
  color: string;
  minOpacity: number;
  paused: boolean;
  /** Which way the push carries a bar: away from the center, or toward it. */
  direction?: BarDirection;
  /** Waves travelling round the ring at once; only twin reads it. */
  heads?: number;
  /** How much has transferred (0–1); left out, transfer loops. Only transfer reads it. */
  progress?: number;
  /** Steps in the plan, each a segment of the ring. Only plan reads it. */
  steps?: number;
  /** The step running now, counting from 0; earlier steps show as done. Only plan reads it. */
  current?: number;
}

/** `out` pushes bars away from the center; `in` pulls them toward it. */
export type BarDirection = "out" | "in";

/**
 * - `comet`: the wave snaps a bar longer and lets it fall back slowly, so a bright head drags a fading tail.
 * - `twin`: several waves, evenly spaced, travel round together, moving the bars.
 * - `read`: a small wave travels round at a steady pace, lighting bars more than it moves them, like a cursor down lines.
 * - `write`: bars are typed in bursts of four, each popping and leaving a short mark, until the ring is written; then
 *   the marks are wiped in the same order.
 * - `seek`: the wave runs forward, slows, backs up part of the way and runs on, like hunting for a match.
 * - `stream`: short pulses chase each other round with uneven gaps, like tokens arriving.
 * - `transfer`: bars fill clockwise to `progress`, the leading bar pulsing; with no `progress` it fills and drains on a loop.
 * - `ping`: a pulse leaves 12 o'clock both ways, meets at 6, waits, and comes back, like a request and its response.
 * - `plan`: the ring is cut into `steps` segments; done steps hold grown, the `current` one sweeps, the rest rest.
 */
export type BarAnimation = "comet" | "twin" | "read" | "write" | "seek" | "stream" | "transfer" | "ping" | "plan";

export const BAR_ANIMATIONS: BarAnimation[] = ["comet", "twin", "read", "write", "seek", "stream", "transfer", "ping", "plan"];

/** How each animation spends its push: `grow` stretches the bar's leading end, `rise` moves the whole bar. */
const BAR_SPEND: Record<BarAnimation, { grow: number; rise: number }> = {
  comet: { grow: 1, rise: 0 },
  twin: { grow: 0, rise: 1 },
  // Reading lights the bars more than it moves them.
  read: { grow: 0.35, rise: 0 },
  write: { grow: 1, rise: 0 },
  seek: { grow: 0, rise: 1 },
  stream: { grow: 1, rise: 0 },
  transfer: { grow: 1, rise: 0 },
  ping: { grow: 0, rise: 1 },
  plan: { grow: 1, rise: 0 },
};

/** Every number the drawing reads, as the latest props want it. */
export function barTargets(s: BarSettings) {
  return {
    ...colorTargets(s.color),
    barHeight: s.barHeight,
    barWidth: s.barWidth,
    radius: s.radius,
    extend: s.extend,
    duration: s.duration,
    stagger: s.stagger,
    minOpacity: s.minOpacity,
    heads: Math.min(4, Math.max(1, s.heads ?? 2)),
    // 0 pushes outward, 1 pulls inward; it glides, so a switch eases the ring from one side to the other.
    inward: s.direction === "in" ? 1 : 0,
    // Whether a progress was given, so leaving it out glides back to the looping transfer.
    determinate: s.progress === undefined ? 0 : 1,
    progress: Math.min(1, Math.max(0, s.progress ?? 0)),
    steps: Math.min(8, Math.max(2, s.steps ?? 4)),
    current: Math.max(0, s.current ?? 1),
  };
}

export type BarKey = keyof ReturnType<typeof barTargets>;

/** Seconds (roughly) each prop takes to glide: color and opacity fade quickly, geometry and timing take `SETTLE`. */
export const barSettle: Partial<Record<BarKey | "size", number>> = {
  red: FADE_SETTLE,
  green: FADE_SETTLE,
  blue: FADE_SETTLE,
  alpha: FADE_SETTLE,
  minOpacity: FADE_SETTLE,
  barHeight: SETTLE,
  barWidth: SETTLE,
  radius: SETTLE,
  extend: SETTLE,
  duration: SETTLE,
  stagger: SETTLE,
  heads: SETTLE,
  inward: SETTLE,
  determinate: SETTLE,
  progress: SETTLE,
  steps: SETTLE,
  current: SETTLE,
  size: SETTLE,
};

/** The bar count, clamped to 12–72. */
function barCountOf(s: BarSettings) {
  return Math.min(72, Math.max(12, Math.round(s.bars)));
}

/** A bar count can't be fractional, so a change cross-fades the old ring out while the new one fades in. */
export const barShape = {
  key: (s: BarSettings) => String(barCountOf(s)),
  build: barCountOf,
  settle: FADE_SETTLE,
};

/** How much of each animation is on screen (0–1). Animations left out are off. */
export type BarMix = Partial<Record<BarAnimation, number>>;

const TAU = Math.PI * 2;
/** Share of a comet's push spent snapping out; the rest is the tail falling back. */
const BAR_COMET_ATTACK = 0.2;
/** Bars typed in one burst before the pause; four keeps a burst inside the 3–4 units that may move at once. */
const BAR_WRITE_BURST = 4;
/** How long a typed bar stays, as a share of its full push. */
const BAR_WRITE_INK = 0.35;
/** Bars a seek runs forward, then backs up, each round. It nets five bars on. */
const BAR_SEEK_AHEAD = 8;
const BAR_SEEK_BACK = 3;
/** Where each stream pulse sits round the lap: a burst of three, a pair, then a long gap, like tokens arriving. */
const BAR_STREAM_PULSES = [0, 0.07, 0.18, 0.41, 0.52];
/** How grown a finished plan step holds. */
const BAR_PLAN_DONE = 0.4;

function barClamp(t: number) {
  return Math.min(1, Math.max(0, t));
}

/** A raised cosine: a smooth bump with no jolt at rest or at the peak, so a wave reads as one swell. */
function barSwell(local: number, duration: number) {
  return local >= 0 && local < duration ? 0.5 - 0.5 * Math.cos((TAU * local) / duration) : 0;
}

/** Seconds each animation's loop takes, so its phase can advance by rate and stay put when timing changes. */
function barCycles(bars: number, v: Values<BarKey>) {
  const stagger = Math.max(0.01, v.stagger);
  const duration = Math.max(0.05, v.duration);
  return {
    // One lap is every bar taking its turn.
    wave: bars * stagger,
    // A looping transfer: fill clockwise, hold full for one push, drain in the same order, hold empty for one push.
    fill: 2 * ((bars - 1) * stagger + 2 * duration),
    write: barWriteTimes(bars, stagger, duration).cycle,
    // One seek round: run ahead at the wave's pace, then back up at two thirds of it.
    seek: (BAR_SEEK_AHEAD + 1.5 * BAR_SEEK_BACK) * stagger,
    // Out to 6 o'clock, wait two pushes, back to 12, wait two pushes before the next request.
    ping: bars * stagger + 4 * duration + duration,
    // One sweep through the current step.
    plan: (bars / Math.min(8, Math.max(2, v.steps))) * stagger + duration,
    // The transfer's leading bar pulses every four pushes.
    pulse: 4 * duration,
  };
}

/**
 * When a write types each bar: bursts of `BAR_WRITE_BURST` keystrokes `stagger` apart, with a burst-long pause between.
 * Once every bar is typed it holds for a pause, wipes the marks clockwise at twice the pace, and pauses again.
 */
function barWriteTimes(bars: number, stagger: number, duration: number) {
  const pause = BAR_WRITE_BURST * stagger;
  const burst = BAR_WRITE_BURST * stagger + pause;
  const lastKey = Math.floor((bars - 1) / BAR_WRITE_BURST) * burst + ((bars - 1) % BAR_WRITE_BURST) * stagger;
  const wipe = lastKey + duration + pause;
  return { burst, wipe, cycle: wipe + ((bars - 1) * stagger) / 2 + duration + pause };
}

/**
 * A ring of bars standing on an inner circle, counted clockwise from 12 o'clock. Each animation gives every bar a
 * push (0–1) from its place on the ring; `mix` says how much of each animation is on screen. It is read every
 * frame, so a switch glides one animation's pushes into the next.
 */
export function barScene<S extends BarSettings, K extends string>(mix: (v: Values<K | BarKey>) => BarMix): Scene<S, K | BarKey, number> {
  // How far through its loop each clock has come (0–1). Advancing by rate keeps the motion in place while the
  // timing or bar count changes, and lets pausing coast to a stop.
  const phase = { wave: 0, fill: 0, write: 0, seek: 0, ping: 0, plan: 0, pulse: 0 };
  // Bars the seek has netted so far; each round moves it on by ahead − back.
  let seekBase = 0;

  return {
    advance(dt, { v, settings }) {
      const cycles = barCycles(barCountOf(settings), v);
      for (const k of ["wave", "fill", "write", "ping", "plan", "pulse"] as const) phase[k] = (phase[k] + (dt * v.rate) / cycles[k]) % 1;
      phase.seek += (dt * v.rate) / cycles.seek;
      if (phase.seek >= 1) {
        phase.seek %= 1;
        seekBase = (seekBase + BAR_SEEK_AHEAD - BAR_SEEK_BACK) % barCountOf(settings);
      }
    },
    draw(ctx, { v, size, layers }) {
      const height = Math.max(0, v.barHeight);
      const extend = Math.max(0, v.extend);
      const weights = mix(v);
      const center = size / 2;
      const inward = barClamp(v.inward);
      // Room is left outside for the farthest an outward push reaches, so it never carries past the canvas edge.
      // An inward push needs that room inside instead, so the ring sits further out.
      const inner = Math.max(1, center - height - extend * (1 - inward) - 1);
      const stagger = Math.max(0.01, v.stagger);
      const minOpacity = v.minOpacity;
      const heads = Math.min(4, Math.max(1, v.heads));

      ctx.fillStyle = rgb(v);
      ctx.translate(center, center);
      for (const { shape: bars, fade } of layers) {
        const step = TAU / bars;
        const cycles = barCycles(bars, v);
        // A bar never grows wider than its slot at the inner end, so neighbors can touch but not overlap.
        const width = Math.min(Math.max(0, v.barWidth), 2 * inner * Math.sin(step / 2));
        // A bar's push can't outlast the lap, and a twin's can't run into the next head.
        const duration = Math.min(cycles.wave, Math.max(0.05, v.duration));
        const twinDuration = Math.min(cycles.wave / heads, duration);
        const head = phase.wave * bars;
        const fillTime = phase.fill * cycles.fill;
        const drain = cycles.fill / 2;
        const writeTime = phase.write * cycles.write;
        const writes = barWriteTimes(bars, stagger, duration);
        // The seek head moves on screen, so both legs take the strong ease-in-out.
        const seekTime = phase.seek * cycles.seek;
        const ahead = BAR_SEEK_AHEAD * stagger;
        const seekHead =
          seekBase +
          (seekTime < ahead
            ? BAR_SEEK_AHEAD * easeInOut(seekTime / ahead)
            : BAR_SEEK_AHEAD - BAR_SEEK_BACK * easeInOut((seekTime - ahead) / (cycles.seek - ahead)));
        // The seek's bump is `duration ÷ stagger` bars wide, centered on the head, since it travels both ways.
        const seekWidth = duration / stagger;
        const pingTime = phase.ping * cycles.ping;
        const pingBack = (bars / 2) * stagger + 2 * duration;
        const steps = Math.min(8, Math.max(2, v.steps));
        const planTime = phase.plan * cycles.plan;
        const pulse = barSwell(phase.pulse * cycles.pulse, duration);
        const filled = barClamp(v.progress) * bars;

        for (let i = 0; i < bars; i++) {
          // Seconds since the wave's head passed this bar.
          const local = ((((head - i) % bars) + bars) % bars) * stagger;
          let grow = 0;
          let rise = 0;
          let glow = 0;

          for (const name of BAR_ANIMATIONS) {
            const w = weights[name] ?? 0;
            if (w <= 0) continue;
            let lift = 0;
            // How lit the bar is, when that differs from how far it is pushed.
            let light: number | undefined;
            switch (name) {
              case "comet": {
                // Snaps out on the strong ease-out, then falls back on its mirror image: the drop is quick right
                // behind the head and lingers at the end, so the tail fades out instead of cutting off.
                const u = local / duration;
                lift = u < BAR_COMET_ATTACK ? easeOut(u / BAR_COMET_ATTACK) : u < 1 ? 1 - easeOut((u - BAR_COMET_ATTACK) / (1 - BAR_COMET_ATTACK)) : 0;
                break;
              }
              case "twin":
                // Heads sit evenly round the ring; while the count glides, the newest head fades in.
                for (let h = 0; h < Math.ceil(heads); h++) {
                  const back = (h * bars) / heads;
                  const t = ((((head - i - back) % bars) + bars) % bars) * stagger;
                  lift = Math.max(lift, Math.min(1, heads - h) * barSwell(t, twinDuration));
                }
                break;
              case "read":
                lift = barSwell(local, duration);
                break;
              case "write": {
                const key = writeTime - (Math.floor(i / BAR_WRITE_BURST) * writes.burst + (i % BAR_WRITE_BURST) * stagger);
                if (key < 0) break;
                // A keystroke pops out on the strong ease-out and settles back to its mark; the wipe eases it away.
                const u = key / duration;
                const stroke = u < BAR_COMET_ATTACK ? easeOut(u / BAR_COMET_ATTACK) : 1 - (1 - BAR_WRITE_INK) * easeOut(barClamp((u - BAR_COMET_ATTACK) / (1 - BAR_COMET_ATTACK)));
                lift = stroke * (1 - easeOut(barClamp((writeTime - writes.wipe - (i * stagger) / 2) / duration)));
                break;
              }
              case "seek": {
                let d = (((seekHead - i) % bars) + bars) % bars;
                if (d > bars / 2) d -= bars;
                lift = Math.abs(d) < seekWidth / 2 ? 0.5 + 0.5 * Math.cos((TAU * d) / seekWidth) : 0;
                break;
              }
              case "stream":
                for (const at of BAR_STREAM_PULSES) lift = Math.max(lift, barSwell(((((local / stagger - at * bars) % bars) + bars) % bars) * stagger, duration));
                break;
              case "transfer": {
                // Determinate: full up to the progress, the part-filled leading bar pulsing so it reads as working.
                const part = barClamp(filled - i);
                const leading = i === Math.floor(filled) ? (1 - part) * pulse : 0;
                const loop = easeOut(barClamp((fillTime - i * stagger) / duration)) * (1 - easeOut(barClamp((fillTime - drain - i * stagger) / duration)));
                lift = v.determinate * (part + leading) + (1 - v.determinate) * loop;
                break;
              }
              case "ping": {
                // Steps count out from 12 o'clock both ways, so the request meets at 6 and the response comes back.
                const out = Math.min(i, bars - i) * stagger;
                lift = Math.max(barSwell(pingTime - out, duration), barSwell(pingTime - pingBack - ((bars / 2) * stagger - out), duration));
                break;
              }
              case "plan": {
                // Steps glide, so a change of step count slides the segment edges rather than jumping them.
                const at = (i * steps) / bars;
                const own = Math.floor(at);
                const into = (at - own) * (bars / steps) * stagger;
                const done = barClamp(v.current - own);
                const running = barClamp(1 - Math.abs(v.current - own));
                lift = done * BAR_PLAN_DONE + running * barSwell(planTime - into, duration);
                light = done + running * barSwell(planTime - into, duration);
                break;
              }
            }
            grow += w * lift * BAR_SPEND[name].grow;
            rise += w * lift * BAR_SPEND[name].rise;
            glow += w * (light ?? lift);
          }

          // Outward, a grow stretches the outer end and a rise moves the bar out; inward, the inner end stretches
          // toward the center and the bar moves in. Neither may cross the center.
          const length = height + extend * grow;
          const base = Math.max(1, inner + extend * rise * (1 - 2 * inward) - extend * grow * inward);
          const corner = Math.min(Math.max(0, v.radius), width / 2, length / 2);

          ctx.globalAlpha = v.alpha * fade * (minOpacity + (1 - minOpacity) * barClamp(glow));
          // Start at 12 o'clock and go clockwise; each bar points straight out from the center.
          ctx.save();
          ctx.rotate(i * step);
          ctx.beginPath();
          ctx.roundRect(-width / 2, -base - length, width, length, corner);
          ctx.fill();
          ctx.restore();
        }
      }
    },
  };
}
