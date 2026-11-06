"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { planMotion } from "../lib/sheet-motions";

export interface SquarePlanProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds the plan would take to tick the whole sheet; each move takes its share of that. */
  duration?: number;
  /** Seconds the full sheet holds before it clears. */
  gap?: number;
  /** How much of the plan is done (0–1), shown as that share of rows ticked; a change glides. Leave it out to tick and clear on a loop. */
  progress?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Ticked dots are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<SquarePlanProps, "duration" | "gap">> & Pick<SquarePlanProps, "progress">;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...planMotion.targets(s) };
}

function scene() {
  return sheetScene(planMotion);
}

const shape = sheetShape("square");

export function SquarePlan({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 4,
  gap = 0.6,
  progress,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Planning",
  ...rest
}: SquarePlanProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, progress, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default SquarePlan;
