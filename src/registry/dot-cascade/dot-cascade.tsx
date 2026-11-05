"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { cascadeMotion } from "../lib/globe-motions";

export type DotCascadePattern = "rings" | "fibonacci" | "grid";

export interface DotCascadeProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. */
  pattern?: DotCascadePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds each row takes to complete its 360° turn. */
  duration?: number;
  /** Seconds between one row starting and the next row below it. */
  stagger?: number;
  /** Seconds the orb rests after the bottom row finishes, before the next wave. */
  gap?: number;
  /** Spin direction around the vertical axis. */
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

type Settings = GlobeSettings & Required<Pick<DotCascadeProps, "duration" | "stagger" | "gap" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...cascadeMotion.targets(s) };
}

export function DotCascade({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 1.4,
  stagger = 0.08,
  gap = 0.6,
  direction = "left",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotCascadeProps) {
  const settings: Settings = { pattern, dotSize, density, size, duration, stagger, gap, direction, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} scene={cascadeMotion.scene} label={label} {...rest} />;
}

export default DotCascade;
