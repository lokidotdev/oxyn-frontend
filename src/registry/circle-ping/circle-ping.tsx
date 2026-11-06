"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { pingMotion } from "../lib/sheet-motions";

export interface CirclePingProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds for the ping to reach the edge, and for the echo to come back. */
  duration?: number;
  /** Seconds between the ping reaching the edge and the echo setting off back. */
  wait?: number;
  /** Seconds to rest after the echo lands, before the next ping. */
  gap?: number;
  /** Thickness of the ring of large dots, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Dots inside the outgoing ring are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<CirclePingProps, "duration" | "wait" | "gap" | "ringWidth">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...pingMotion.targets(s) };
}

function scene() {
  return sheetScene(pingMotion);
}

const shape = sheetShape("circle");

export function CirclePing({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 0.9,
  wait = 0.35,
  gap = 0.5,
  ringWidth = 0.3,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Calling tool",
  ...rest
}: CirclePingProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, wait, gap, ringWidth, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default CirclePing;
