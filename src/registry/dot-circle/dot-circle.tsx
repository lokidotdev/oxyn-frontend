"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetMixScene, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { breathMotion, pulseMotion, waveMotion } from "../lib/sheet-motions";
import { mixTargets, withDefaults } from "../lib/mix";

/**
 * - `pulse`: a ring of swollen dots spreads from the center to the edge.
 * - `breath`: every dot grows and shrinks together, with optional center-to-edge ripple.
 * - `wave`: the sheet breathes in a sweep from one side to the other.
 */
export type DotCircleAnimation = "pulse" | "breath" | "wave";

export interface DotCircleProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Which animation the sheet runs. Changing it morphs the dots from the old animation into the new one. */
  animation?: DotCircleAnimation;
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
  /** Seconds for one ring to cross the sheet (pulse), one breath (breath) or one dot's breath (wave). Defaults per animation. */
  duration?: number;
  /** Seconds to rest between loops. Defaults per animation. */
  gap?: number;
  /** pulse: thickness of the ring of large dots, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** breath: seconds the edge lags behind the center. 0 breathes in sync. */
  ripple?: number;
  /** wave: seconds the far side lags behind the near side. */
  spread?: number;
  /** pulse: "out" or "in". wave: "right" or "left". A value the animation doesn't take is ignored. */
  direction?: "out" | "in" | "right" | "left";
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of resting dots (0–1). Dots at full size are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Motion = {
  duration: number;
  gap: number;
  ringWidth: number;
  ripple: number;
  spread: number;
  pulseDirection: "out" | "in";
  waveDirection: "right" | "left";
};

const ANIMATIONS: DotCircleAnimation[] = ["pulse", "breath", "wave"];

const SHARED: Motion = { duration: 1.6, gap: 0.3, ringWidth: 0.35, ripple: 0, spread: 0.9, pulseDirection: "out", waveDirection: "right" };

/** Each animation's own timing, used for any prop that isn't passed. */
const DEFAULTS: Record<DotCircleAnimation, Motion> = {
  pulse: { ...SHARED, duration: 1.6, gap: 0.3 },
  breath: { ...SHARED, duration: 2.4, gap: 0.2 },
  wave: { ...SHARED, duration: 1.2, gap: 0.3 },
};

type Settings = SheetSettings & Motion & { animation: DotCircleAnimation };

/** Every number any of the animations reads, plus how much of each is on screen. */
function targetsOf(s: Settings) {
  return {
    ...sheetTargets(s),
    ...pulseMotion.targets({ ...s, direction: s.pulseDirection }),
    ...breathMotion.targets(s),
    ...waveMotion.targets({ ...s, direction: s.waveDirection }),
    ...mixTargets(ANIMATIONS, s.animation),
  };
}

function scene() {
  return sheetMixScene({ pulse: pulseMotion, breath: breathMotion, wave: waveMotion });
}

const shape = sheetShape("circle");

export function DotCircle({
  animation = "pulse",
  dotShape = "round",
  dotSize = 2.5,
  scale = 1.5,
  density = 11,
  size = 160,
  duration,
  gap,
  ringWidth,
  ripple,
  spread,
  direction,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  ...rest
}: DotCircleProps) {
  const active = ANIMATIONS.includes(animation) ? animation : "pulse";
  const motion = withDefaults(DEFAULTS[active], {
    duration,
    gap,
    ringWidth,
    ripple,
    spread,
    pulseDirection: direction === "out" || direction === "in" ? direction : undefined,
    waveDirection: direction === "right" || direction === "left" ? direction : undefined,
  });
  const settings: Settings = { animation: active, dotShape, dotSize, scale, density, size, color, minOpacity, paused, ...motion };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} scene={scene} label={label} {...rest} />;
}

export default DotCircle;
