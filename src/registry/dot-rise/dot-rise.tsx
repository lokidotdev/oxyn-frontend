"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { globeSettle, riseMotion } from "../lib/globe-motions";

export type DotRisePattern = "rings" | "fibonacci" | "grid";

export interface DotRiseProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The wave follows it: ring by ring, row by row, or a stripe winding along the spiral. */
  pattern?: DotRisePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** "up" (upload): the wave pushes rows outward on its way up and fades them off the top. "down" (download): it pulls them inward on its way down. */
  direction?: "up" | "down";
  /** up: how far the wave pushes the dots outward, as a fraction of the orb's radius. */
  lift?: number;
  /** down: how far the wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** How many rows the wave moves at once. */
  width?: number;
  /** Seconds for the wave to travel from one pole to the other. */
  duration?: number;
  /** Seconds the orb rests after the wave leaves, before the next one. */
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

type Settings = GlobeSettings & Required<Pick<DotRiseProps, "direction" | "lift" | "depth" | "width" | "duration" | "gap">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...riseMotion.targets(s) };
}

export function DotRise({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  direction = "up",
  lift = 0.16,
  depth = 0.2,
  width = 3.5,
  duration = 1.4,
  gap = 0.4,
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = direction === "down" ? "Downloading" : "Uploading",
  ...rest
}: DotRiseProps) {
  const settings: Settings = { pattern, dotSize, density, size, direction, lift, depth, width, duration, gap, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={riseMotion.scene} label={label} {...rest} />;
}

export default DotRise;
