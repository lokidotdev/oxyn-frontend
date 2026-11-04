"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetScene, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";

export interface SquarePulseProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Seconds for one ring to travel across the sheet. */
  duration?: number;
  /** Seconds to rest between rings. */
  gap?: number;
  /** Thickness of the ring of large dots, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** "out" spreads from the center to the edge; "in" closes from the edge to the center. */
  direction?: "out" | "in";
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Dots inside the ring are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = SheetSettings & Required<Pick<SquarePulseProps, "duration" | "gap" | "ringWidth" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return {
    ...sheetTargets(s),
    duration: s.duration,
    gap: s.gap,
    ringWidth: s.ringWidth,
    // 0 spreads out from the center, 1 closes in from the edge; between, the ring flattens across.
    inward: s.direction === "in" ? 1 : 0,
  };
}

const scene = sheetScene<keyof ReturnType<typeof targetsOf>>(
  (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap),
  (t, v) => {
    const turn = Math.max(0.05, v.duration);
    const width = Math.max(0.05, v.ringWidth);
    const inward = v.inward;
    // The ring starts fully inside the center and ends fully past the edge, so
    // every dot gets one complete swell. During the gap it sits off-sheet.
    const ring = t < turn ? -width + (t / turn) * (1 + 2 * width) : Infinity;
    return ({ d }) => {
      const distance = d + (1 - 2 * d) * inward;
      const x = Math.abs(distance - ring) / width;
      // Cosine bump: 1 at the ring's center line, easing to 0 at its edges.
      return x < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * x) : 0;
    };
  },
);

const shape = sheetShape("square");

export function SquarePulse({
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration = 1.6,
  gap = 0.3,
  ringWidth = 0.35,
  direction = "out",
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  ...rest
}: SquarePulseProps) {
  const settings: Settings = { dotShape, dotSize, scale, density, size, duration, gap, ringWidth, direction, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} scene={scene} label={label} {...rest} />;
}

export default SquarePulse;
