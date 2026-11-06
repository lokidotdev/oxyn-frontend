"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { awaitMotion } from "../lib/sheet-motions";

export interface CircleAwaitProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds for one heartbeat: the double beat, then the rest it settles into. */
  duration?: number;
  /** Extra seconds to rest between heartbeats. */
  gap?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). The whole sheet sits at this while it waits; the center dot is always 1 at the beat. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<CircleAwaitProps, "duration" | "gap">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...awaitMotion.targets(s) };
}

function scene() {
  return sheetScene(awaitMotion);
}

const shape = sheetShape("circle");

export function CircleAwait({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 2.4,
  gap = 0.6,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Waiting for approval",
  ...rest
}: CircleAwaitProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default CircleAwait;
