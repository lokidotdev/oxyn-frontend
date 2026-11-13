"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { uploadMotion } from "../lib/sheet-motions";

export interface CircleUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds for the rings to swell in turn from the edge to the center, before the center pops. */
  duration?: number;
  /** Seconds to rest after the pop, before the next gather. */
  gap?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). The center dot is always 1 as it pops. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<CircleUploadProps, "duration" | "gap">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...uploadMotion.targets(s) };
}

function scene() {
  return sheetScene(uploadMotion);
}

const shape = sheetShape("circle");

export function CircleUpload({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 1.1,
  gap = 0.4,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Uploading",
  ...rest
}: CircleUploadProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default CircleUpload;
