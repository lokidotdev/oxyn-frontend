"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { streamMotion } from "../lib/sheet-motions";

export interface SquareStreamProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Shape of each dot. */
  dotShape?: "round" | "square";
  /** Resting dot size in px. */
  dotSize?: number;
  /** How many times larger a dot grows at the peak of the animation. */
  scale?: number;
  /** Dots per row across the sheet. */
  density?: number;
  /** Canvas size in px (the sheet is square). */
  size?: number;
  /** Seconds for output lines to land on every row once, top to bottom. */
  duration?: number;
  /** Older lines still lit behind the newest; each steps down as the next lands. */
  trail?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). The newest line is always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<SquareStreamProps, "duration" | "trail">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...streamMotion.targets(s) };
}

function scene() {
  return sheetScene(streamMotion);
}

const shape = sheetShape("square");

export function SquareStream({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 1.6,
  trail = 3,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Running",
  ...rest
}: SquareStreamProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, trail, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default SquareStream;
