"use client";

import type { HTMLAttributes } from "react";
import { barScene, barSettle, barShape, barTargets } from "../lib/bars";
import type { BarDirection, BarSettings } from "../lib/bars";
import { LoaderCanvas } from "../lib/loader-canvas";

export interface BarParallelProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of bars around the ring (12–72). */
  bars?: number;
  /** Resting height of each bar in px, pointing out from the center. */
  barHeight?: number;
  /** Thickness of each bar in px. */
  barWidth?: number;
  /** Corner radius of each bar in px. */
  radius?: number;
  /** How far each wave moves a bar, in px. The bar keeps its height. */
  extend?: number;
  /** Seconds one bar takes to move out and back. */
  duration?: number;
  /** Seconds between one bar starting and the next, going clockwise. */
  stagger?: number;
  /** Which way the push carries a bar: `out` away from the center, `in` toward it. */
  direction?: BarDirection;
  /** Waves travelling round the ring at once (1–4), evenly spaced. */
  heads?: number;
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Bar color, any CSS color. */
  color?: string;
  /** Opacity of resting bars (0–1). Bars at the peak of the push are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

function scene() {
  return barScene<BarSettings, never>(() => ({ parallel: 1 }));
}

export function BarParallel({
  bars = 36,
  barHeight = 12,
  barWidth = 2,
  radius = 1,
  extend = 10,
  duration = 0.24,
  stagger = 0.06,
  direction = "out",
  heads = 2,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Loading",
  ...rest
}: BarParallelProps) {
  const settings: BarSettings = { bars, barHeight, barWidth, radius, extend, duration, stagger, direction, heads, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={barTargets} shape={barShape} settle={barSettle} scene={scene} label={label} {...rest} />;
}

export default BarParallel;
