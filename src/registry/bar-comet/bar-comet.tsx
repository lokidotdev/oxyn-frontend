"use client";

import type { HTMLAttributes } from "react";
import { barScene, barSettle, barShape, barTargets } from "../lib/bars";
import type { BarDirection, BarSettings } from "../lib/bars";
import { LoaderCanvas } from "../lib/loader-canvas";

export interface BarCometProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of bars around the ring (12–72). */
  bars?: number;
  /** Resting height of each bar in px, pointing out from the center. */
  barHeight?: number;
  /** Thickness of each bar in px. */
  barWidth?: number;
  /** Corner radius of each bar in px. */
  radius?: number;
  /** How far the comet's head grows a bar, in px. The end away from the push never moves. */
  extend?: number;
  /** Seconds one bar takes to snap out and fade back: the length of the tail. */
  duration?: number;
  /** Seconds between one bar starting and the next, going clockwise. */
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
  return barScene<BarSettings, never>(() => ({ comet: 1 }));
}

export function BarComet({
  bars = 36,
  barHeight = 12,
  barWidth = 2,
  radius = 1,
  extend = 10,
  duration = 0.5,
  stagger = 0.05,
  direction = "out",
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Loading",
  ...rest
}: BarCometProps) {
  const settings: BarSettings = { bars, barHeight, barWidth, radius, extend, duration, stagger, direction, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={barTargets} shape={barShape} settle={barSettle} scene={scene} label={label} {...rest} />;
}

export default BarComet;
