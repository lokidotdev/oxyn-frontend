"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { globeSettle, parallelMotion } from "../lib/globe-motions";

export type DotParallelPattern = "rings" | "fibonacci" | "grid";

export interface DotParallelProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The waves follow it: ring by ring, row by row, or stripes winding down the spiral. */
  pattern?: DotParallelPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Waves travelling down the orb at once (1–4), evenly spaced: one per call running in parallel. */
  waves?: number;
  /** How far every other wave pushes the dots outward, as a fraction of the orb's radius. */
  lift?: number;
  /** How far the remaining waves pull the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** Seconds for each wave to travel from the top pole to the bottom one. */
  duration?: number;
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

type Settings = GlobeSettings & Required<Pick<DotParallelProps, "waves" | "lift" | "depth" | "duration">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...parallelMotion.targets(s) };
}

export function DotParallel({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  waves = 2,
  lift = 0.16,
  depth = 0.2,
  duration = 2,
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Running tools",
  ...rest
}: DotParallelProps) {
  const settings: Settings = { pattern, dotSize, density, size, waves, lift, depth, duration, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={parallelMotion.scene} label={label} {...rest} />;
}

export default DotParallel;
