"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetMixScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { breathMotion, editMotion, fillMotion, planMotion, pulseMotion, readMotion, streamMotion, waveMotion } from "../lib/sheet-motions";
import { mixTargets, withDefaults } from "../lib/mix";

/**
 * - `pulse`: a ring of swollen dots spreads from the center to the edge.
 * - `breath`: every dot grows and shrinks together, with optional center-to-edge ripple.
 * - `wave`: the sheet breathes in a sweep from one side to the other.
 * - `fill`: the pulse ring leaves every dot swollen until the sheet is full, then a second ring shrinks them back.
 * - `read`: a read head runs along each row in turn, like eyes across text, leaving a few rows fading behind it.
 * - `edit`: a few whole rows are typed in dot by dot, the cursor blinks, and the block lets go.
 * - `stream`: output lines of uneven length land row by row from the top, the newest brightest, like a terminal.
 * - `plan`: ticks forward to a stop, blinks, then carries on or steps back; at the end the sheet clears and starts over; or shows `progress`.
 */
export type DotSquareAnimation = "pulse" | "breath" | "wave" | "fill" | "read" | "edit" | "stream" | "plan";

export interface DotSquareProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Which animation the sheet runs. Changing it morphs the dots from the old animation into the new one; every other prop keeps its value. */
  animation?: DotSquareAnimation;
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
  /** Seconds for one ring to cross the sheet (pulse), one breath (breath), one dot's breath (wave), one crossing of the fill or empty ring (fill), one read of the sheet (read), one edit (edit), one pass of output lines down the sheet (stream) or ticking the whole sheet (plan). */
  duration?: number;
  /** Seconds to rest between loops (plan: seconds the full sheet holds before it clears). stream ignores it. */
  gap?: number;
  /** pulse and fill: thickness of the ring of large (pulse) or changing (fill) dots, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** breath: seconds the edge lags behind the center. 0 breathes in sync. */
  ripple?: number;
  /** wave: seconds the far side lags behind the near side. */
  spread?: number;
  /** read: rows the fading trail covers behind the read head. stream: older lines still lit behind the newest. */
  trail?: number;
  /** plan: how much of the plan is done (0–1), shown as that share of rows ticked; a change glides. Leave it out to tick and clear on a loop. */
  progress?: number;
  /** pulse and fill: "out" or "in". wave: "right" or "left". A value the animation doesn't take is ignored. */
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
  trail: number;
  progress: number | undefined;
  pulseDirection: "out" | "in";
  waveDirection: "right" | "left";
};

const ANIMATIONS: DotSquareAnimation[] = ["pulse", "breath", "wave", "fill", "read", "edit", "stream", "plan"];

/** Used for any prop that isn't passed. The same for every animation, so switching animation changes nothing else. */
const DEFAULTS: Motion = { duration: 1.6, gap: 0.3, ringWidth: 0.35, ripple: 0, spread: 0.9, trail: 3, progress: undefined, pulseDirection: "out", waveDirection: "right" };

/**
 * Where the shared default would break an animation, its own default for props that aren't passed: at 1.6s the
 * read head would race through the sheet faster than anything reads, and a plan's rows would tick off too fast to
 * read as items.
 */
const OWN: Partial<Record<DotSquareAnimation, Partial<Motion>>> = { read: { duration: 3.5, gap: 0.4 }, plan: { duration: 4, gap: 0.6 } };

type Settings = SheetSettings & Motion & { animation: DotSquareAnimation };

/** Every number any of the animations reads, plus how much of each is on screen. */
function targetsOf(s: Settings) {
  return {
    ...sheetTargets(s),
    ...pulseMotion.targets({ ...s, direction: s.pulseDirection }),
    ...breathMotion.targets(s),
    ...waveMotion.targets({ ...s, direction: s.waveDirection }),
    ...readMotion.targets(s),
    ...streamMotion.targets(s),
    ...planMotion.targets(s),
    ...mixTargets(ANIMATIONS, s.animation),
  };
}

function scene() {
  return sheetMixScene({ pulse: pulseMotion, breath: breathMotion, wave: waveMotion, fill: fillMotion, read: readMotion, edit: editMotion, stream: streamMotion, plan: planMotion });
}

const shape = sheetShape("square");

export function DotSquare({
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
  trail,
  progress,
  direction,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  ...rest
}: DotSquareProps) {
  const active = ANIMATIONS.includes(animation) ? animation : "pulse";
  const motion = withDefaults({ ...DEFAULTS, ...OWN[active] }, {
    duration,
    gap,
    ringWidth,
    ripple,
    spread,
    trail,
    progress,
    pulseDirection: direction === "out" || direction === "in" ? direction : undefined,
    waveDirection: direction === "right" || direction === "left" ? direction : undefined,
  });
  const settings: Settings = { animation: active, dotShape, dotSize, scale, density, size, color, minOpacity, paused, ...motion };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default DotSquare;
