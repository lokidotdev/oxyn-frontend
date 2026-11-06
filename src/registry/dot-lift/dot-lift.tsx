"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { globeSettle, liftMotion } from "../lib/globe-motions";

export type DotLiftPattern = "rings" | "fibonacci" | "grid";

export interface DotLiftProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The stagger follows it: ring by ring, row by row, or a stripe winding down the spiral. */
  pattern?: DotLiftPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** How far each ring pushes outward before settling back, as a fraction of the orb's radius. */
  lift?: number;
  /** Seconds each ring takes to push out and settle back into place. */
  duration?: number;
  /** Seconds between one ring starting and the next one along. Rings in motion at once ≈ duration ÷ stagger. */
  stagger?: number;
  /** Seconds the orb rests after the last ring settles, before the next wave. */
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

type Settings = GlobeSettings & Required<Pick<DotLiftProps, "lift" | "duration" | "stagger" | "gap" | "from">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...liftMotion.targets(s) };
}

export function DotLift({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  lift = 0.16,
  duration = 0.5,
  stagger = 0.14,
  gap = 0.5,
  from = "top",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotLiftProps) {
  const settings: Settings = { pattern, dotSize, density, size, lift, duration, stagger, gap, from, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={liftMotion.scene} label={label} {...rest} />;
}

export default DotLift;
