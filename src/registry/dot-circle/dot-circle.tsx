"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { sheetMixScene, sheetSettle, sheetShape, sheetTargets } from "../lib/sheet";
import type { SheetSettings } from "../lib/sheet";
import { awaitMotion, idleMotion, loadMotion, uploadMotion, pingMotion, thinkMotion, searchMotion, processMotion } from "../lib/sheet-motions";
import { mixTargets, withDefaults } from "../lib/mix";

/**
 * - `think`: a ring of swollen dots spreads from the center to the edge.
 * - `idle`: every dot grows and shrinks together, with optional center-to-edge ripple.
 * - `process`: the sheet breathes in a sweep from one side to the other.
 * - `load`: the think ring leaves every dot swollen until the sheet is full, then a second ring shrinks them back.
 * - `ping`: a ring leaves the center for the edge, waits, and a fainter echo comes back in, like a request and its response.
 * - `upload`: rings swell in turn from the edge inward, then the center pops once, as if the bundle were sent.
 * - `await`: the sheet rests dim while the center beats slowly, a double beat like a heartbeat.
 * - `search`: a wedge sweeps around the center at a steady pace, leaving a fading trail.
 */
export type DotCircleAnimation = "think" | "idle" | "process" | "load" | "ping" | "upload" | "await" | "search";

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
  /** Seconds for one ring to cross the sheet (think), one breath (idle), one dot's breath (process), one crossing of the fill or empty ring (load) one leg of the ping (ping), the upload closing in (upload), one heartbeat (await) or one turn of the sweep (search). */
  duration?: number;
  /** Seconds to rest between loops. search ignores it. */
  gap?: number;
  /** think and load: thickness of the ring of large (think) or changing (load) dots, as a fraction of the sheet radius. */
  ringWidth?: number;
  /** idle: seconds the edge lags behind the center. 0 breathes in sync. */
  ripple?: number;
  /** process: seconds the far side lags behind the near side. */
  spread?: number;
  /** ping: seconds between the ping reaching the edge and the echo setting off back. */
  wait?: number;
  /** think and load: "out" or "in". process: "right" or "left". A value the animation doesn't take is ignored. */
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
  thinkDirection: "out" | "in";
  processDirection: "right" | "left";
};

const ANIMATIONS: DotCircleAnimation[] = ["think", "idle", "process", "load", "ping", "upload", "await", "search"];

/** Used for any prop that isn't passed. The same for every animation, so switching animation changes nothing else. */
const DEFAULTS: Motion = { duration: 1.6, gap: 0.3, ringWidth: 0.35, ripple: 0, spread: 0.9, wait: 0.35, thinkDirection: "out", processDirection: "right" };

/**
 * Where the shared default would break an animation, its own default for props that aren't passed: at 1.6s a leg,
 * a ping takes over 4s to come back and stops reading as one round trip, an upload drags, a heartbeat races and a
 * search sweep spins faster than it searches.
 */
const OWN: Partial<Record<DotCircleAnimation, Partial<Motion>>> = {
  ping: { duration: 0.9, gap: 0.5, ringWidth: 0.3 },
  upload: { duration: 1.1, gap: 0.4 },
  await: { duration: 2.4, gap: 0.6 },
  search: { duration: 2 },
};

type Settings = SheetSettings & Motion & { animation: DotCircleAnimation };

/** Every number any of the animations reads, plus how much of each is on screen. */
function targetsOf(s: Settings) {
  return {
    ...sheetTargets(s),
    ...thinkMotion.targets({ ...s, direction: s.thinkDirection }),
    ...idleMotion.targets(s),
    ...processMotion.targets({ ...s, direction: s.processDirection }),
    ...pingMotion.targets(s),
    ...uploadMotion.targets(s),
    ...awaitMotion.targets(s),
    ...searchMotion.targets(s),
    ...mixTargets(ANIMATIONS, s.animation),
  };
}

function scene() {
  return sheetMixScene({ think: thinkMotion, idle: idleMotion, process: processMotion, load: loadMotion, ping: pingMotion, upload: uploadMotion, await: awaitMotion, search: searchMotion });
}

const shape = sheetShape("circle");

export function DotCircle({
  animation = "think",
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
  const active = ANIMATIONS.includes(animation) ? animation : "think";
  const motion = withDefaults({ ...DEFAULTS, ...OWN[active] }, {
    duration,
    gap,
    ringWidth,
    ripple,
    spread,
    wait,
    thinkDirection: direction === "out" || direction === "in" ? direction : undefined,
    processDirection: direction === "right" || direction === "left" ? direction : undefined,
  });
  const settings: Settings = { animation: active, dotShape, dotSize, scale, density, size, color, minOpacity, paused, ...motion };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} settle={sheetSettle} scene={scene} label={label} {...rest} />;
}

export default DotCircle;
