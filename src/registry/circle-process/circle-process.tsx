"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { processMotion } from "../lib/sheet-motions";

export interface CircleProcessProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds for one dot's full breath (grow, then shrink). */
  duration?: number;
  /** Seconds to rest between breaths. */
  gap?: number;
  /** Seconds the far side lags behind the near side. 0 breathes in sync. */
  spread?: number;
  /** Which way the breath travels across the sheet. */
  direction?: "right" | "left";
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Dots at full breath are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<CircleProcessProps, "duration" | "gap" | "spread" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...processMotion.targets(s) };
}

function scene() {
  return sheetScene(processMotion);
}

const shape = sheetShape("circle");

export function CircleProcess({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 1.2,
  gap = 0.3,
  spread = 0.9,
  direction = "right",
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  ...rest
}: CircleProcessProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, spread, direction, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default CircleProcess;
