"use client";

import type { HTMLAttributes } from "react";
import { waveScene, waveSettle, waveShape, waveTargets } from "../lib/waves";
import type { WaveAlign, WaveMix, WaveSettings } from "../lib/waves";
import { LoaderCanvas } from "../lib/loader-canvas";

export interface WaveLoadProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of bars in the row (3–32). */
  bars?: number;
  /** Width of each bar in px. Width and gap shrink together if the row would overflow. */
  barWidth?: number;
  /** Space between bars in px. */
  gap?: number;
  /** Corner radius of each bar in px; half the width makes pills. */
  radius?: number;
  /** Height of a resting bar in px. */
  minHeight?: number;
  /** Height of a bar at the peak of the motion in px. */
  maxHeight?: number;
  /** Seconds one bar takes to bounce up and back. */
  duration?: number;
  /** Seconds between one bar bouncing and the next, going left to right. */
  stagger?: number;
  /** Where the bars grow from: `center` up and down from the middle, `bottom` up from a shared floor. */
  align?: WaveAlign;
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Bar color, any CSS color. */
  color?: string;
  /** Opacity of resting bars (0–1). Bars at the peak are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

/** Only load is on screen. One object for every frame, so drawing allocates nothing. */
const MIX: WaveMix = { load: 1 };

function scene() {
  return waveScene<WaveSettings, never>(() => MIX);
}

export function WaveLoad({
  bars = 9,
  barWidth = 6,
  gap = 6,
  radius = 3,
  minHeight = 15,
  maxHeight = 60,
  duration = 0.42,
  stagger = 0.1,
  align = "center",
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Loading",
  ...rest
}: WaveLoadProps) {
  const settings: WaveSettings = { bars, barWidth, gap, radius, minHeight, maxHeight, duration, stagger, align, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={waveTargets} shape={waveShape} settle={waveSettle} scene={scene} label={label} {...rest} />;
}

export default WaveLoad;
