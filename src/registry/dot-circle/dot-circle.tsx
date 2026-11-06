"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetMixScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { awaitMotion, breathMotion, fillMotion, gatherMotion, pingMotion, pulseMotion, radarMotion, waveMotion } from "../lib/sheet-motions";
import { mixTargets, withDefaults } from "../lib/mix";

/**
 * - `pulse`: a ring of swollen dots spreads from the center to the edge.
 * - `breath`: every dot grows and shrinks together, with optional center-to-edge ripple.
 * - `wave`: the sheet breathes in a sweep from one side to the other.
 * - `fill`: the pulse ring leaves every dot swollen until the sheet is full, then a second ring shrinks them back.
 * - `ping`: a ring leaves the center for the edge, waits, and a fainter echo comes back in, like a request and its response.
 * - `gather`: rings swell in turn from the edge inward, then the center pops once, as if the bundle were sent.
 * - `await`: the sheet rests dim while the center beats slowly, a double beat like a heartbeat.
 * - `radar`: a wedge sweeps around the center at a steady pace, leaving a fading trail.
 */
export type DotCircleAnimation = "pulse" | "breath" | "wave" | "fill" | "ping" | "gather" | "await" | "radar";

export interface DotCircleProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Which animation the sheet runs. Changing it morphs the dots from the old animation into the new one; every other prop keeps its value. */
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
  /** Seconds for one ring to cross the sheet (pulse), one breath (breath), one dot's breath (wave), one crossing of the fill or empty ring (fill) one leg of the ping (ping), the gather closing in (gather), one heartbeat (await) or one turn of the sweep (radar). */
  duration?: number;
  /** Seconds to rest between loops. radar ignores it. */
  gap?: number;
  /** pulse and fill: thickness of the ring of large (pulse) or changing (fill) dots, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** breath: seconds the edge lags behind the center. 0 breathes in sync. */
  ripple?: number;
  /** wave: seconds the far side lags behind the near side. */
  spread?: number;
  /** ping: seconds between the ping reaching the edge and the echo setting off back. */
  wait?: number;
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
  wait: number;
  pulseDirection: "out" | "in";
  waveDirection: "right" | "left";
};

const ANIMATIONS: DotCircleAnimation[] = ["pulse", "breath", "wave", "fill", "ping", "gather", "await", "radar"];

/** Used for any prop that isn't passed. The same for every animation, so switching animation changes nothing else. */
const DEFAULTS: Motion = { duration: 1.6, gap: 0.3, ringWidth: 0.35, ripple: 0, spread: 0.9, wait: 0.35, pulseDirection: "out", waveDirection: "right" };

/**
 * Where the shared default would break an animation, its own default for props that aren't passed: at 1.6s a leg,
 * a ping takes over 4s to come back and stops reading as one round trip, a gather drags, a heartbeat races and a
 * radar sweep spins faster than it searches.
 */
const OWN: Partial<Record<DotCircleAnimation, Partial<Motion>>> = {
  ping: { duration: 0.9, gap: 0.5, ringWidth: 0.3 },
  gather: { duration: 1.1, gap: 0.4 },
  await: { duration: 2.4, gap: 0.6 },
  radar: { duration: 2 },
};

type Settings = SheetSettings & Motion & { animation: DotCircleAnimation };

/** Every number any of the animations reads, plus how much of each is on screen. */
function targetsOf(s: Settings) {
  return {
    ...sheetTargets(s),
    ...pulseMotion.targets({ ...s, direction: s.pulseDirection }),
    ...breathMotion.targets(s),
    ...waveMotion.targets({ ...s, direction: s.waveDirection }),
    ...pingMotion.targets(s),
    ...gatherMotion.targets(s),
    ...awaitMotion.targets(s),
    ...radarMotion.targets(s),
    ...mixTargets(ANIMATIONS, s.animation),
  };
}

function scene() {
  return sheetMixScene({ pulse: pulseMotion, breath: breathMotion, wave: waveMotion, fill: fillMotion, ping: pingMotion, gather: gatherMotion, await: awaitMotion, radar: radarMotion });
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
  wait,
  direction,
  color = "#e4e4e7",
  minOpacity = 0.25,
  paused = false,
  label = "Thinking",
  ...rest
}: DotCircleProps) {
  const active = ANIMATIONS.includes(animation) ? animation : "pulse";
  const motion = withDefaults({ ...DEFAULTS, ...OWN[active] }, {
    duration,
    gap,
    ringWidth,
    ripple,
    spread,
    wait,
    pulseDirection: direction === "out" || direction === "in" ? direction : undefined,
    waveDirection: direction === "right" || direction === "left" ? direction : undefined,
  });
  const settings: Settings = { animation: active, dotShape, dotSize, scale, density, size, color, minOpacity, paused, ...motion };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default DotCircle;
