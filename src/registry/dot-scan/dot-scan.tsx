"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { globeSettle, scanMotion } from "../lib/globe-motions";

export type DotScanPattern = "rings" | "fibonacci" | "grid";

export interface DotScanProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The band follows it: ring by ring, row by row, or a stripe winding down the spiral. */
  pattern?: DotScanPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds for the band to read from the top pole to the bottom one. */
  duration?: number;
  /** Seconds the orb rests after the band leaves, before the next read. */
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

type Settings = GlobeSettings & Required<Pick<DotScanProps, "duration" | "gap">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...scanMotion.targets(s) };
}

export function DotScan({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 2,
  gap = 0.4,
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Reading",
  ...rest
}: DotScanProps) {
  const settings: Settings = { pattern, dotSize, density, size, duration, gap, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={scanMotion.scene} label={label} {...rest} />;
}

export default DotScan;
