"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { globeSettle, reasonMotion } from "../lib/globe-motions";

export type DotReasonPattern = "rings" | "fibonacci" | "grid";

export interface DotReasonProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. Every turn lands the dots back on it. */
  pattern?: DotReasonPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Turns in each scramble. The same turns then play back in reverse to solve the orb. */
  moves?: number;
  /** Seconds for one turn. */
  duration?: number;
  /** Seconds the orb holds once scrambled, and again once solved. */
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

type Settings = GlobeSettings & Required<Pick<DotReasonProps, "moves" | "duration" | "gap">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...reasonMotion.targets(s) };
}

export function DotReason({
  pattern = "grid",
  dotSize = 3,
  density = 12,
  size = 160,
  moves = 4,
  duration = 0.5,
  gap = 0.4,
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotReasonProps) {
  const settings: Settings = { pattern, dotSize, density, size, moves, duration, gap, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={reasonMotion.scene} label={label} {...rest} />;
}

export default DotReason;
