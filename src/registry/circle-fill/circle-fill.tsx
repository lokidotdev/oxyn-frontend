"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { fillMotion } from "../lib/sheet-motions";

export interface CircleFillProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Shape of each dot. */
  dotShape?: "round" | "square";
  /** Resting dot size in px. */
  dotSize?: number;
  /** How many times larger a dot grows at the peak of the animation. */
  scale?: number;
  /** Dots per row across the sheet. */
  density?: number;
  /** Canvas size in px. */
  size?: number;
  /** Seconds for the ring to cross the sheet once; it crosses twice per loop, once to fill and once to empty. */
  duration?: number;
  /** Seconds to rest between loops. */
  gap?: number;
  /** Thickness of the ring where dots are growing or shrinking, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** "out" fills and empties from the center to the edge; "in" from the edge to the center. */
  direction?: "out" | "in";
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Dots at full size are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<CircleFillProps, "duration" | "gap" | "ringWidth" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...fillMotion.targets(s) };
}

function scene() {
  return sheetScene(fillMotion);
}

const shape = sheetShape("circle");

export function CircleFill({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 1.2,
  gap = 0.3,
  ringWidth = 0.35,
  direction = "out",
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  ...rest
}: CircleFillProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, ringWidth, direction, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default CircleFill;
