"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { breathMotion } from "../lib/sheet-motions";

export interface CircleBreathProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds for one full breath (grow, then shrink). */
  duration?: number;
  /** Seconds to rest between breaths. */
  gap?: number;
  /** Seconds the edge lags behind the center. 0 breathes in sync. */
  ripple?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Dots at full breath are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<CircleBreathProps, "duration" | "gap" | "ripple">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...breathMotion.targets(s) };
}

function scene() {
  return sheetScene(breathMotion);
}

const shape = sheetShape("circle");

export function CircleBreath({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 2.4,
  gap = 0.2,
  ripple = 0,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  ...rest
}: CircleBreathProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, ripple, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} scene={scene} label={label} {...rest} />;
}

export default CircleBreath;
