"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { noiseScene, noiseSettle, noiseTargets, soloNoise } from "../lib/noise-rings";
import type { NoiseSettings } from "../lib/noise-rings";

export interface NoiseDriftProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of concentric rings (1–5). */
  lines?: number;
  /** Stroke width of each ring in px. */
  lineWidth?: number;
  /** Furthest the outer ring is pushed in or out by the noise, in px. Inner rings move proportionally less. */
  amplitude?: number;
  /** How many bumps run around a ring. Low values give broad, soft swells; high values give tighter ripples. */
  frequency?: number;
  /** How fast the noise drifts over time. */
  speed?: number;
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

function scene() {
  const motion = soloNoise("drift");
  return noiseScene<NoiseSettings, never>(() => motion);
}

export function NoiseDrift({
  lines = 4,
  lineWidth = 1,
  amplitude = 8,
  frequency = 0.8,
  speed = 0.7,
  spread = 0.12,
  lineSpacing = 3,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Thinking",
  ...rest
}: NoiseDriftProps) {
  const settings: NoiseSettings = { lines, lineWidth, amplitude, frequency, speed, spread, lineSpacing, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={noiseTargets} settle={noiseSettle} scene={scene} label={label} {...rest} />;
}

export default NoiseDrift;
