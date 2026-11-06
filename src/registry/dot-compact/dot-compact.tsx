"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { compactMotion, globeSettle } from "../lib/globe-motions";

export type DotCompactPattern = "rings" | "fibonacci" | "grid";

export interface DotCompactProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The waves follow it: ring by ring, row by row, or stripes winding along the spiral. */
  pattern?: DotCompactPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** How far the waves pull the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** Seconds for one squeeze: the waves meeting at the equator, the waist holding, and letting go. */
  duration?: number;
  /** Seconds the orb rests after the waist lets go, before the next squeeze. */
  gap?: number;
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

type Settings = GlobeSettings & Required<Pick<DotCompactProps, "depth" | "duration" | "gap">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...compactMotion.targets(s) };
}

export function DotCompact({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  depth = 0.2,
  duration = 1.8,
  gap = 0.4,
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Compacting",
  ...rest
}: DotCompactProps) {
  const settings: Settings = { pattern, dotSize, density, size, depth, duration, gap, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={compactMotion.scene} label={label} {...rest} />;
}

export default DotCompact;
