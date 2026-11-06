"use client";

import type { HTMLAttributes } from "react";
import { barScene, barSettle, barShape, barTargets } from "../lib/bars";
import type { BarDirection, BarSettings } from "../lib/bars";
import { LoaderCanvas } from "../lib/loader-canvas";

export interface BarTransferProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Number of bars around the ring (12–72). */
  bars?: number;
  /** Resting height of each bar in px, pointing out from the center. */
  barHeight?: number;
  /** Thickness of each bar in px. */
  barWidth?: number;
  /** Corner radius of each bar in px. */
  radius?: number;
  /** How far a transferred bar grows, in px. Use direction out for uploads and in for downloads. */
  extend?: number;
  /** Seconds one bar takes to grow, and the leading bar's pulse (it pulses every four of these). */
  duration?: number;
  /** Seconds between one bar filling and the next while looping. */
  stagger?: number;
  /** Which way the push carries a bar: `out` away from the center, `in` toward it. */
  direction?: BarDirection;
  /** How much has transferred (0–1). Leave it out to fill and drain on a loop. */
  progress?: number;
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
  return barScene<BarSettings, never>(() => ({ transfer: 1 }));
}

export function BarTransfer({
  bars = 36,
  barHeight = 12,
  barWidth = 2,
  radius = 1,
  extend = 10,
  duration = 0.16,
  stagger = 0.04,
  direction = "out",
  progress,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Loading",
  ...rest
}: BarTransferProps) {
  const settings: BarSettings = { bars, barHeight, barWidth, radius, extend, duration, stagger, direction, progress, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={barTargets} shape={barShape} settle={barSettle} scene={scene} label={label} {...rest} />;
}

export default BarTransfer;
