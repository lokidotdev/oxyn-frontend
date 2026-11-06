"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { readMotion } from "../lib/sheet-motions";

export interface SquareReadProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds for one read of the whole sheet, from the first dot until the trail clears the last row. */
  duration?: number;
  /** Seconds to rest between reads. */
  gap?: number;
  /** Rows the fading trail covers behind the read head. */
  trail?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). The dot under the read head is always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<SquareReadProps, "duration" | "gap" | "trail">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...readMotion.targets(s) };
}

function scene() {
  return sheetScene(readMotion);
}

const shape = sheetShape("square");

export function SquareRead({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 3.5,
  gap = 0.4,
  trail = 3,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Reading",
  ...rest
}: SquareReadProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, trail, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default SquareRead;
