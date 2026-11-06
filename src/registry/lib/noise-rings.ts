import { colorTargets, rgb } from "./color";
import { easeInOut, easeInOutCubic, easeOut } from "./ease";
import { BLEND_SETTLE, FADE_SETTLE } from "./glide";
import type { Scene, Values } from "./loader-canvas";
import type { MixKey } from "./mix";

/**
 * - `drift`: the noise drifts on its own, each ring a little behind the one outside it.
 * - `ripple`: a push starts at the innermost ring and travels outward, like a drop landing in water.
 * - `breathe`: the wobble swells, then calms almost to circles, and swells again.
 * - `swirl`: the noise turns around the center, inner rings trailing behind, so the shape twists.
 * - `converge`: the rings close up into one line, then fan back out.
 * - `level`: the wobble follows the `level` prop, so the rings can react to a voice or audio input.
 * - `flow`: rings are born at the center as calm circles and travel out, gaining wobble, to fade at the edge
 *   (sending, uploading); `direction: "in"` runs them the other way (receiving, downloading).
 * - `stream`: each token sends a small push out from the innermost ring, at uneven gaps set by `rate` (streaming an answer).
 * - `focus`: a lens of 3–4 rings pulls tight and brightens around one ring, calming inside, and slowly moves
 *   from the innermost ring to the outer and back (deep reading, analysis).
 * - `scatter`: the wobble grows ring by ring from the center outward, sharpening into tight ripples, then calms
 *   (broad search). Pairs with `converge` for "found".
 */
export type NoiseAnimation =
  | "drift"
  | "ripple"
  | "breathe"
  | "swirl"
  | "converge"
  | "level"
  | "flow"
  | "stream"
  | "focus"
  | "scatter";

export const NOISE_ANIMATIONS: NoiseAnimation[] = [
  "drift",
  "ripple",
  "breathe",
  "swirl",
  "converge",
  "level",
  "flow",
  "stream",
  "focus",
  "scatter",
];

/** Props every noise ring takes. `level` only matters to `level`, `direction` only to `flow`, and `rate` only to `stream`. */
export interface NoiseSettings {
  level?: number;
  direction?: "out" | "in";
  /** Tokens per second while streaming. */
  rate?: number;
  /** Seconds for one loop of the animation. Drift, level and stream have no loop and ignore it. */
  duration?: number;
  lines: number;
  lineWidth: number;
  amplitude: number;
  frequency: number;
  speed: number;
  spread: number;
  lineSpacing: number;
  size: number;
  color: string;
  minOpacity: number;
  paused: boolean;
}

/** Every number the drawing reads, as the latest props want it. */
export function noiseTargets(s: NoiseSettings) {
  return {
    ...colorTargets(s.color),
    lines: Math.min(5, Math.max(1, Math.round(s.lines))),
    lineWidth: s.lineWidth,
    amplitude: s.amplitude,
    frequency: s.frequency,
    speed: s.speed,
    duration: Math.max(0.1, s.duration ?? NOISE_DURATION),
    spread: s.spread,
    lineSpacing: s.lineSpacing,
    minOpacity: s.minOpacity,
    level: Math.min(1, Math.max(0, s.level ?? 0.5)),
    // 0 flows out from the center, 1 flows in from the edge; between, the rings gather in the middle and turn round.
    inward: s.direction === "in" ? 1 : 0,
    // Named apart from the pause `rate` every scene already reads.
    tokens: Math.max(0, s.rate ?? 6),
  };
}

export type NoiseKey = keyof ReturnType<typeof noiseTargets>;

/**
 * Seconds (roughly) each target takes to glide to a new value. Color and opacity fade quickly; `level` tracks
 * a live input, so it follows at the same quick pace to smooth raw readings without lagging speech. A switch
 * of `animation` morphs the rings at the blend pace. Geometry, speed and size take the default `SETTLE`.
 */
export const noiseSettle: Partial<Record<NoiseKey | MixKey<NoiseAnimation>, number>> = {
  red: FADE_SETTLE,
  green: FADE_SETTLE,
  blue: FADE_SETTLE,
  alpha: FADE_SETTLE,
  minOpacity: FADE_SETTLE,
  level: FADE_SETTLE,
  inward: BLEND_SETTLE,
  mix_drift: BLEND_SETTLE,
  mix_ripple: BLEND_SETTLE,
  mix_breathe: BLEND_SETTLE,
  mix_swirl: BLEND_SETTLE,
  mix_converge: BLEND_SETTLE,
  mix_level: BLEND_SETTLE,
  mix_flow: BLEND_SETTLE,
  mix_stream: BLEND_SETTLE,
  mix_focus: BLEND_SETTLE,
  mix_scatter: BLEND_SETTLE,
};

/** How much of each animation is on screen. The radii are blended, so a switch morphs the rings. */
export type NoiseMotion = Record<NoiseAnimation, number>;

/** Only `name` on screen. */
export function soloNoise(name: NoiseAnimation): NoiseMotion {
  const out = {} as NoiseMotion;
  for (const a of NOISE_ANIMATIONS) out[a] = a === name ? 1 : 0;
  return out;
}

/**
 * Raw noise rarely leaves ±0.5; this stretches it so `amplitude` is close to the real swing.
 * The tanh around it is a soft limit, so peaks round off instead of flattening into corners.
 */
const NOISE_GAIN = 2.2;

const TAU = Math.PI * 2;
/** Seconds per loop when no `duration` is passed. Each single component passes its own, which the group also uses. */
const NOISE_DURATION = 4;
/** Most each ring trails the one outside it while swirling, in radians. */
const SWIRL_LAG = 0.2;
/** Where a flowing ring is born, as a share of the outer radius, so it never starts as a dot. */
const FLOW_START = 0.12;
/** Shares of a crossing a flowing ring takes to fade in at its start, and out at its end. */
const FLOW_FADE_IN = 0.2;
const FLOW_FADE_OUT = 0.35;
/**
 * Gaps between streamed tokens, in average gaps: short runs, a few long pauses. It repeats every
 * `STREAM_GAPS.length` tokens, and the gaps average exactly 1, so `rate` stays the true tokens per second.
 */
const STREAM_GAPS = [0.35, 0.5, 0.3, 2.4, 0.9, 0.4, 0.45, 3.2, 1, 0.35, 1.7, 0.45];
/** Seconds a token's push takes to pass through one ring, and to go from the ring before it to this one. */
const STREAM_PUSH = 0.36;
const STREAM_STEP = 0.1;
/** Share of a push spent rising; the rest it spends letting go. */
const STREAM_RISE = 0.3;
/** Rings either side of the focused one the lens reaches; it fades out by this distance, so 3–4 rings are in it. */
const FOCUS_REACH = 2;
/** How far the rings in the lens close up on the focused one (1 = onto it). */
const FOCUS_PULL = 0.6;
/** Shares of a cycle each scattering ring spends growing, holding wild, and calming. The rest it holds calm. */
const SCATTER_GROW = 0.35;
const SCATTER_HOLD = 0.2;
const SCATTER_CALM = 0.3;

// Improved Perlin noise (3D). The quintic fade keeps the field smooth through its
// second derivative, so the rings bend in soft curves with no creases at cell edges.
const perm = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  // Fixed seed so every render (and the server) gets the same field.
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from({ length: 512 }, (_, i) => p[i & 255]);
})();

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** Smooth noise in roughly -1..1. */
function noise3(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = perm[X] + Y;
  const AA = perm[A] + Z;
  const AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y;
  const BA = perm[B] + Z;
  const BB = perm[B + 1] + Z;
  return lerp(
    lerp(
      lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  );
}

/** 0 → 1 → 0 over the first `width` of each cycle, resting at 0 for the rest. */
function bump(t: number, width: number) {
  const u = (t - Math.floor(t)) / width;
  return u < 1 ? 0.5 - 0.5 * Math.cos(TAU * u) : 0;
}

/** How one animation shapes one ring. Animations are blended by mixing the radii these produce. */
interface Pose {
  /** Share of the ring's normal distance in from the outer ring (1 = evenly spaced, 0 = on the outer ring). */
  spacing: number;
  /** Slice of the noise field the ring reads. */
  z: number;
  /** Share of the full noise swing (0 = a perfect circle). */
  wobble: number;
  /** Turn of the noise field around the center, in radians. */
  turn: number;
  /** Outward push in px, applied evenly all the way round. */
  push: number;
  /** 0 = the ring's resting opacity, 1 = fully opaque. */
  glow: number;
  /** Opacity of the ring before `glow`; by default its place in the stack, outer ring brightest. */
  rest: number;
  /** How much of the ring is drawn at all (0–1): a flowing ring fades away entirely at both ends of its trip. */
  fade: number;
  /** Multiplies `frequency`, so the bumps around the ring get tighter (above 1) or broader. */
  detail: number;
}

/**
 * Concentric rings warped by smooth noise, counted inward from the outer edge. `motion` says how much of each
 * animation is on screen; it is read every frame, so a switch can glide.
 */
export function noiseScene<S extends NoiseSettings, K extends string>(
  motion: (v: Values<K | NoiseKey>) => NoiseMotion,
): Scene<S, K | NoiseKey, never> {
  // `time` is the noise drift (paced by `speed`); `loop` counts loops of the animation (paced by `duration`).
  let time = 0;
  let loop = 0;
  // Streaming: tokens sent so far (fractional), seconds since the scene began, and when each recent token went out.
  let sent = 0;
  let clock = 0;
  const tokens: number[] = [];
  let xs = new Float32Array(0);
  let ys = new Float32Array(0);
  let rs = new Float32Array(0);
  const pose: Pose = { spacing: 1, z: 0, wobble: 1, turn: 0, push: 0, glow: 0, rest: 1, fade: 1, detail: 1 };

  return {
    advance(dt, { v }) {
      time += dt * v.speed * v.rate;
      loop += (dt * v.rate) / v.duration;
      // Walk the gap pattern: every whole gap crossed sends one token. Real seconds, not noise time, so `rate` means
      // tokens per second whatever `speed` is.
      clock += dt * v.rate;
      let gap = dt * v.rate * v.tokens;
      while (gap > 0) {
        const index = Math.floor(sent) % STREAM_GAPS.length;
        const left = (Math.floor(sent) + 1 - sent) * STREAM_GAPS[index];
        if (gap < left) {
          sent += gap / STREAM_GAPS[index];
          break;
        }
        gap -= left;
        sent = Math.floor(sent) + 1;
        tokens.push(clock);
      }
      // A push is gone once it has passed the outer ring of the biggest stack.
      while (tokens.length && clock - tokens[0] > STREAM_PUSH + 5 * STREAM_STEP) tokens.shift();
    },
    draw(ctx, { v, size }) {
      const lineWidth = Math.max(0, v.lineWidth);
      const amplitude = Math.max(0, v.amplitude);
      const frequency = v.frequency;
      const spread = v.spread;
      const minOpacity = v.minOpacity;
      // Fractional while gliding: the ring past the whole count fades in or out.
      const count = Math.max(1, v.lines);
      const rings = Math.ceil(count);
      const center = size / 2;
      // Inset by the widest swing so the outer ring is never clipped.
      const outer = Math.max(1, center - amplitude - lineWidth);
      const spacing = Math.max(0, v.lineSpacing);
      // Enough samples that the curve stays smooth at any size.
      const samples = Math.max(64, Math.ceil((2 * Math.PI * center) / 3));
      if (xs.length < samples) {
        xs = new Float32Array(samples);
        ys = new Float32Array(samples);
        rs = new Float32Array(samples);
      }

      const mix = motion(v);
      const weights = NOISE_ANIMATIONS.map((name) => Math.max(0, mix[name]));
      const total = weights.reduce((a, b) => a + b, 0) || 1;

      ctx.strokeStyle = rgb(v);
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";

      // Rings are counted inward from the outer edge, so adding one only touches the innermost.
      for (let j = 0; j < rings; j++) {
        const presence = Math.min(1, count - j);
        const k = Math.max(0, 1 - j / Math.max(1, count - 1)); // 1 = outer, 0 = innermost
        // Rings step inward from the outer edge, `lineSpacing` apart.
        const base = Math.max(1, outer - j * spacing);
        // Inner rings swing less, so the whole field warps like one surface.
        const swing = amplitude * (base / outer);
        // Walking the noise around a circle closes the loop seamlessly; each ring
        // reads a slightly different slice of time so neighbors ripple together.
        const z = time - j * spread;
        const rest = minOpacity + (1 - minOpacity) * k;
        let opacity = 0;
        rs.fill(0, 0, samples);

        for (let a = 0; a < NOISE_ANIMATIONS.length; a++) {
          const w = weights[a] / total;
          if (w <= 0) continue;
          pose.spacing = 1;
          pose.z = z;
          pose.wobble = 1;
          pose.turn = 0;
          pose.push = 0;
          pose.glow = 0;
          pose.rest = rest;
          pose.fade = 1;
          pose.detail = 1;

          switch (NOISE_ANIMATIONS[a]) {
            case "ripple": {
              // Counted from the innermost ring, so the push travels outward. Each ring takes 40% of a cycle
              // and starts 12% after the ring inside it, so 3–4 rings are moving at once.
              const pushed = bump(loop - (rings - 1 - j) * 0.12, 0.4);
              pose.wobble = 0.35;
              pose.push = amplitude * 0.65 * pushed;
              pose.glow = pushed;
              break;
            }
            case "breathe":
              // The outer ring leads; each ring inward follows a moment later.
              pose.wobble = 0.08 + 0.92 * (0.5 - 0.5 * Math.cos(TAU * (loop - j * 0.05)));
              break;
            case "swirl":
              // The field turns while it changes slowly, so the twist reads. Inner rings fall behind as it winds up,
              // then catch up again, so the lag stays small enough that neighbors never tangle.
              pose.z = time * 0.4 - j * spread;
              // One full turn per loop; the lag winds up and back over two.
              pose.turn = loop * TAU - j * SWIRL_LAG * (0.5 - 0.5 * Math.cos(loop * Math.PI));
              break;
            case "converge": {
              // Hold a moment closed and a moment open: the cosine is clipped at both ends before easing.
              const wave = 0.5 - 0.5 * Math.cos(TAU * (loop - j * 0.04));
              const closed = easeInOutCubic(Math.min(1, Math.max(0, (wave - 0.15) / 0.7)));
              // Merged rings read the same slice of noise, so they land on exactly one line.
              pose.spacing = 1 - closed;
              pose.z = time - j * spread * (1 - closed);
              pose.glow = closed * 0.5;
              break;
            }
            case "level":
              pose.wobble = v.level;
              break;
            case "flow": {
              // The ring is the unit: each one is a whole crossing apart ÷ the ring count, so they stay evenly
              // spaced, and travels at a steady pace (linear), since the flow never stops.
              const trip = loop + (rings - 1 - j) / rings;
              const along = trip - Math.floor(trip);
              const out = along + (1 - 2 * along) * v.inward;
              // Born calm at the center, gaining the full wobble by the edge.
              const target = outer * (FLOW_START + (1 - FLOW_START) * out);
              pose.push = target - Math.max(1, outer - j * spacing);
              pose.wobble = out;
              // The ring moves through the stack, so its opacity follows where it is, not which ring it is.
              pose.rest = minOpacity + (1 - minOpacity) * out;
              // Fades in quickly as it appears and out slowly as it leaves, eased out both ways.
              const appear = easeOut(Math.min(1, along / FLOW_FADE_IN));
              const leave = 1 - easeOut(Math.max(0, (along - (1 - FLOW_FADE_OUT)) / FLOW_FADE_OUT));
              pose.fade = appear * leave;
              break;
            }
            case "stream": {
              // Each token's push starts at the innermost ring and reaches the next a step later; at 0.36s through
              // a ring and 0.1s a step, 3–4 rings carry one push at once. Close tokens stack, softly capped at 1.
              let still = 1;
              for (const sentAt of tokens) {
                const u = (clock - sentAt - (rings - 1 - j) * STREAM_STEP) / STREAM_PUSH;
                if (u <= 0 || u >= 1) continue;
                // Snaps out (arriving) and lets go with a long tail (leaving): both ease out.
                const kick = u < STREAM_RISE ? easeOut(u / STREAM_RISE) : 1 - easeOut((u - STREAM_RISE) / (1 - STREAM_RISE));
                still *= 1 - kick * 0.6;
              }
              const pushed = 1 - still;
              pose.wobble = 0.35;
              pose.push = amplitude * 0.5 * pushed;
              pose.glow = pushed;
              break;
            }
            case "focus": {
              // The lens sits on a ring counted from the innermost, gliding out to the outer ring and back. It is
              // moving on screen, so each leg eases in and out and lingers a moment at either end.
              const leg = loop;
              const there = 1 - Math.abs(1 - 2 * (leg - Math.floor(leg)));
              const at = easeInOutCubic(there) * (rings - 1);
              const near = Math.max(0, 1 - Math.abs(rings - 1 - j - at) / FOCUS_REACH);
              const lens = 0.5 - 0.5 * Math.cos(Math.PI * near);
              // Close up on the focused ring and read its slice of noise, so the rings in the lens bend together.
              const focused = rings - 1 - at;
              const pull = lens * FOCUS_PULL;
              pose.push = (j - focused) * spacing * pull;
              pose.z = time - (j + (focused - j) * pull) * spread;
              pose.wobble = 1 - 0.75 * lens;
              pose.glow = lens * 0.8;
              break;
            }
            case "scatter": {
              // Counted from the innermost ring, so the wobble travels outward; each ring starts 10% of a cycle after
              // the one inside it and grows over 35%, so 3–4 rings are growing at once. The swell and calm are
              // on-screen morphs, so both ease in and out.
              const u = loop - (rings - 1 - j) * 0.1;
              const phase = u - Math.floor(u);
              const calmFrom = SCATTER_GROW + SCATTER_HOLD;
              const wild =
                phase < SCATTER_GROW
                  ? easeInOut(phase / SCATTER_GROW)
                  : phase < calmFrom
                    ? 1
                    : 1 - easeInOut(Math.min(1, (phase - calmFrom) / SCATTER_CALM));
              // The noise churns faster here, and tightens into more bumps as the ring goes wild.
              pose.z = time * 2 - j * spread;
              pose.wobble = 0.15 + 0.85 * wild;
              pose.detail = 1 + 0.9 * wild;
              pose.glow = wild * 0.3;
              break;
            }
          }

          const r0 = Math.max(1, outer - j * spacing * pose.spacing) + pose.push;
          const amp = swing * pose.wobble;
          for (let i = 0; i < samples; i++) {
            let r = r0;
            if (amp > 0) {
              const t = (i / samples) * TAU - pose.turn;
              const f = frequency * pose.detail;
              r += Math.tanh(noise3(Math.cos(t) * f, Math.sin(t) * f, pose.z) * NOISE_GAIN) * amp;
            }
            rs[i] += r * w;
          }
          opacity += w * pose.fade * (pose.rest + (1 - pose.rest) * Math.min(1, pose.glow));
        }

        for (let i = 0; i < samples; i++) {
          const a = (i / samples) * TAU;
          xs[i] = center + Math.cos(a) * rs[i];
          ys[i] = center + Math.sin(a) * rs[i];
        }

        // Curve through segment midpoints for a stroke with no visible corners.
        ctx.globalAlpha = v.alpha * presence * opacity;
        ctx.beginPath();
        const end = samples - 1;
        ctx.moveTo((xs[end] + xs[0]) / 2, (ys[end] + ys[0]) / 2);
        for (let i = 0; i < samples; i++) {
          const n = (i + 1) % samples;
          ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[n]) / 2, (ys[i] + ys[n]) / 2);
        }
        ctx.closePath();
        ctx.stroke();
      }
    },
  };
}
