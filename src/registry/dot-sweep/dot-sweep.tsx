"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { globeSettle, sweepMotion } from "../lib/globe-motions";

export type DotSweepPattern = "rings" | "fibonacci" | "grid";

export interface DotSweepProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The sweep follows it: a column of the grid, an angle around the rings, or an arm of the spiral. */
  pattern?: DotSweepPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds for the sweep to go once around the orb. */
  duration?: number;
  /** Which way the sweep turns around the vertical axis. */
  direction?: "left" | "right";
  /** Tilt toward the viewer in degrees, so the top of the orb shows. */
  tilt?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of the dots furthest away (0–1). Front dots are always 1. */
  backOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = GlobeSettings & Required<Pick<DotSweepProps, "duration" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...sweepMotion.targets(s) };
}

export function DotSweep({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 2.4,
  direction = "left",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Searching",
  ...rest
}: DotSweepProps) {
  const settings: Settings = { pattern, dotSize, density, size, duration, direction, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={sweepMotion.scene} label={label} {...rest} />;
}

export default DotSweep;
