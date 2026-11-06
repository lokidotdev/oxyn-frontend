"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { mixTargets } from "../lib/mix";
import type { MixKey } from "../lib/mix";
import { NOISE_ANIMATIONS, noiseScene, noiseSettle, noiseTargets } from "../lib/noise-rings";
import type { NoiseAnimation, NoiseSettings } from "../lib/noise-rings";

export type NoiseRingsAnimation = NoiseAnimation;

export interface NoiseRingsProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /**
   * Which animation the rings run: drift, ripple, breathe, swirl, converge, level, flow, stream, focus or scatter.
   * Changing it morphs the rings from the old animation into the new one; every other prop keeps its value.
   */
  animation?: NoiseRingsAnimation;
  /** How strong the wobble is while `animation` is `level` (0–1), e.g. a live microphone level. It glides, so raw readings are fine. */
  level?: number;
  /** Which way rings travel while `animation` is `flow`: "out" from the center (sending), "in" from the edge (receiving). */
  direction?: "out" | "in";
  /** Tokens per second while `animation` is `stream`. Gaps between tokens are uneven; this sets their average. */
  rate?: number;
  /** Number of concentric rings (1–5). */
  lines?: number;
  /** Stroke width of each ring in px. */
  lineWidth?: number;
  /** Furthest the outer ring is pushed in or out by the noise, in px. Inner rings move proportionally less. */
  amplitude?: number;
  /** How many bumps run around a ring. Low values give broad, soft swells; high values give tighter ripples. */
  frequency?: number;
  /** How fast the noise drifts over time. Left out, each animation uses its own, matching its single component. */
  speed?: number;
  /**
   * Seconds for one loop of the animation. Left out, each animation uses its own: the loops run from a couple of
   * seconds to several, so no one default suits them all. Drift, level and
   * stream have no loop and ignore it.
   */
  duration?: number;
  /** How differently neighboring rings move. 0 keeps them in lockstep; higher lets each ring wander on its own. */
  spread?: number;
  /** Gap between neighboring rings in px. */
  lineSpacing?: number;
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Line color, any CSS color. */
  color?: string;
  /** Opacity of the innermost ring (0–1). The outer ring is always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = NoiseSettings & { animation: NoiseRingsAnimation };

/** Each animation's own `duration`, matching its single component. */
const DURATIONS: Partial<Record<NoiseRingsAnimation, number>> = {
  ripple: 3.2,
  breathe: 2.7,
  swirl: 5.7,
  converge: 3.8,
  flow: 2.4,
  focus: 7.6,
  scatter: 4.8,
};

/** Each animation's own `speed` where it differs from the shared 0.35, matching its single component. */
const SPEEDS: Partial<Record<NoiseRingsAnimation, number>> = {
  drift: 0.7,
  level: 0.7,
};

/** Every number the drawing reads, plus how much of each animation is on screen. */
function targetsOf(s: Settings) {
  return { ...noiseTargets(s), ...mixTargets(NOISE_ANIMATIONS, s.animation) };
}

function scene() {
  // Every animation bends the same rings, so a switch glides one shape into the next.
  return noiseScene<Settings, MixKey<NoiseRingsAnimation>>((v) => ({
    drift: v.mix_drift,
    ripple: v.mix_ripple,
    breathe: v.mix_breathe,
    swirl: v.mix_swirl,
    converge: v.mix_converge,
    level: v.mix_level,
    flow: v.mix_flow,
    stream: v.mix_stream,
    focus: v.mix_focus,
    scatter: v.mix_scatter,
  }));
}

export function NoiseRings({
  animation = "drift",
  level = 0.5,
  direction = "out",
  rate = 6,
  lines = 4,
  lineWidth = 1,
  amplitude = 8,
  frequency = 0.8,
  speed,
  duration,
  spread = 0.12,
  lineSpacing = 3,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Thinking",
  ...rest
}: NoiseRingsProps) {
  const active = NOISE_ANIMATIONS.includes(animation) ? animation : "drift";
  const settings: Settings = { animation: active, level, direction, rate, lines, lineWidth, amplitude, frequency, speed: speed ?? SPEEDS[active] ?? 0.35, duration: duration ?? DURATIONS[active], spread, lineSpacing, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} settle={noiseSettle} scene={scene} label={label} {...rest} />;
}

export default NoiseRings;
