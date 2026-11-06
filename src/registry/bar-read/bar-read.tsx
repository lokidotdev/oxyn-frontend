"use client";

import type { HTMLAttributes } from "react";
import { barScene, barSettle, barShape, barTargets } from "../lib/bars";
import type { BarDirection, BarSettings } from "../lib/bars";
import { LoaderCanvas } from "../lib/loader-canvas";

export interface BarReadProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of bars around the ring (12–72). */
  bars?: number;
  /** Resting height of each bar in px, pointing out from the center. */
  barHeight?: number;
  /** Thickness of each bar in px. */
  barWidth?: number;
  /** Corner radius of each bar in px. */
  radius?: number;
  /** How far a full push would grow a bar, in px; reading uses about a third of it. */
  extend?: number;
  /** Seconds one bar stays lit as the reading passes. */
  duration?: number;
  /** Seconds between one bar lighting and the next, going clockwise. */
  stagger?: number;
  /** Which way the push carries a bar: `out` away from the center, `in` toward it. */
  direction?: BarDirection;
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
  return barScene<BarSettings, never>(() => ({ read: 1 }));
}

export function BarRead({
  bars = 36,
  barHeight = 12,
  barWidth = 2,
  radius = 1,
  extend = 10,
  duration = 0.32,
  stagger = 0.09,
  direction = "out",
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Loading",
  ...rest
}: BarReadProps) {
  const settings: BarSettings = { bars, barHeight, barWidth, radius, extend, duration, stagger, direction, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={barTargets} shape={barShape} settle={barSettle} scene={scene} label={label} {...rest} />;
}

export default BarRead;
