"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { tideMotion } from "../lib/globe-motions";

export type DotTidePattern = "rings" | "fibonacci" | "grid";

export interface DotTideProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The wave follows it: ring by ring, row by row, or a stripe winding down the spiral. */
  pattern?: DotTidePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** How far the wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** How many rows the wave pulls in at once. */
  width?: number;
  /** Seconds for the wave to travel from one pole to the other. */
  duration?: number;
  /** Seconds the orb rests after the wave leaves, before the next one. */
  gap?: number;
  /** Which end of the orb the wave starts from. */
  from?: "top" | "bottom";
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

type Settings = GlobeSettings & Required<Pick<DotTideProps, "depth" | "width" | "duration" | "gap" | "from">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...tideMotion.targets(s) };
}

export function DotTide({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  depth = 0.2,
  width = 3.5,
  duration = 1.6,
  gap = 0.4,
  from = "top",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotTideProps) {
  const settings: Settings = { pattern, dotSize, density, size, depth, width, duration, gap, from, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} scene={tideMotion.scene} label={label} {...rest} />;
}

export default DotTide;
