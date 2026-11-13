"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { globeSettle, thinkMotion } from "../lib/globe-motions";

export type DotThinkPattern = "rings" | "fibonacci" | "grid";

export interface DotThinkProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. */
  pattern?: DotThinkPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds for one full 360° turn. */
  duration?: number;
  /** Seconds to rest between turns. 0 spins continuously; above 0 each turn eases in and out. */
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

type Settings = GlobeSettings & Required<Pick<DotThinkProps, "duration" | "gap" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...globeTargets(s), ...thinkMotion.targets(s) };
}

export function DotThink({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 3,
  gap = 0,
  direction = "left",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotThinkProps) {
  const settings: Settings = { pattern, dotSize, density, size, duration, gap, direction, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={thinkMotion.scene} label={label} {...rest} />;
}

export default DotThink;
