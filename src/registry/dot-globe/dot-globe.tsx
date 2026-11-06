"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import {
  cascadeMotion,
  compactMotion,
  globeSettle,
  liftMotion,
  riseMotion,
  scanMotion,
  spinMotion,
  swarmMotion,
  sweepMotion,
  tideMotion,
  twistMotion,
} from "../lib/globe-motions";
import type {
  CascadeSettings,
  CompactSettings,
  GlobeDirection,
  LiftSettings,
  RiseSettings,
  ScanSettings,
  SpinSettings,
  SwarmSettings,
  SweepSettings,
  TideSettings,
  TwistSettings,
} from "../lib/globe-motions";
import { mixScenes, mixTargets, withDefaults } from "../lib/mix";

/**
 * - `spin`: the whole orb turns on its vertical axis.
 * - `cascade`: the orb holds still while each row takes a full turn, one after another.
 * - `lift`: each ring pushes outward and settles back, one after another.
 * - `tide`: a narrow wave travels down the orb, pulling a few rows inward as it passes.
 * - `twist`: the orb scrambles itself like a twisty cube, a row or column turn at a time, then solves itself.
 * - `scan` (reading): a thin band of light reads down the orb at a steady pace.
 * - `rise` (uploading / downloading): a wave pushes rows outward on its way up and fades them off the top, or pulls them inward on its way down.
 * - `sweep` (searching): one lit column sweeps around the orb like a radar, with a short fading trail.
 * - `compact` (compacting): two inward waves leave the poles, meet at the equator as a thin waist, and let go.
 * - `swarm` (parallel tool calls): several narrow waves travel down the orb at once, evenly spaced.
 */
export type DotGlobeAnimation = "spin" | "cascade" | "lift" | "tide" | "twist" | "scan" | "rise" | "sweep" | "compact" | "swarm";

export type DotGlobePattern = "rings" | "fibonacci" | "grid";

export interface DotGlobeProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Which animation the orb runs. Changing it cross-fades from the old animation to the new one; every other prop keeps its value. */
  animation?: DotGlobeAnimation;
  /** How the dots are laid out on the sphere. Staggered and travelling animations follow it. */
  pattern?: DotGlobePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /**
   * Seconds for one turn (spin, twist, sweep), one row's turn (cascade), one ring's push (lift), one pole-to-pole sweep
   * (tide, scan, rise, swarm) or one squeeze (compact). Defaults to 1, or 0.5 for lift, 2 for scan and swarm, 2.4 for sweep and 1.8 for compact.
   */
  duration?: number;
  /** Seconds to rest between loops. twist: seconds the orb holds once scrambled, and again once solved. */
  gap?: number;
  /** cascade, lift: seconds between one row starting and the next one along. Defaults to 0.1, or 0.14 for lift. */
  stagger?: number;
  /** spin, cascade, sweep: which way it turns around the vertical axis. rise: "up" to upload (the default), "down" to download. */
  direction?: GlobeDirection;
  /** lift, tide: which end of the orb the wave starts from. */
  from?: "top" | "bottom";
  /** lift, rise, swarm: how far a ring pushes outward, as a fraction of the orb's radius. */
  lift?: number;
  /** tide, rise, compact, swarm: how far a wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** tide, rise: how many rows the wave moves at once. */
  width?: number;
  /** swarm: waves travelling down the orb at once (1–4), one per call running in parallel. */
  waves?: number;
  /** twist: turns in each scramble. The same turns then play back in reverse to solve the orb. */
  moves?: number;
  /** Tilt toward the viewer in degrees, so the top of the orb shows. */
  tilt?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Opacity of the dots furthest away (0–1). Front dots are always 1. */
  backOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Motion = SpinSettings &
  CascadeSettings &
  LiftSettings &
  TideSettings &
  TwistSettings &
  ScanSettings &
  RiseSettings &
  SweepSettings &
  CompactSettings &
  SwarmSettings;

const ANIMATIONS: DotGlobeAnimation[] = ["spin", "cascade", "lift", "tide", "twist", "scan", "rise", "sweep", "compact", "swarm"];

/**
 * Used for any prop that isn't passed. The same for every animation, so switching animation changes nothing else.
 * rise reads the shared "left" as its default, "up".
 */
const DEFAULTS: Motion = { duration: 1, gap: 0.4, stagger: 0.1, direction: "left", from: "top", lift: 0.16, depth: 0.2, width: 3.5, moves: 4, waves: 2 };

/**
 * Where the shared default would break an animation: at 1s / 0.1s lift would push ~10 rings at once, not 3–4.
 * At 1s the scan and swarm bands and the sweep's head pass each row in ~0.1s, too fast to read, and the
 * compact waves race to the waist.
 */
const ANIMATION_DEFAULTS: Partial<Record<DotGlobeAnimation, Partial<Motion>>> = {
  lift: { duration: 0.5, stagger: 0.14 },
  scan: { duration: 2 },
  sweep: { duration: 2.4 },
  compact: { duration: 1.8 },
  swarm: { duration: 2 },
};

type Settings = GlobeSettings & Motion & { animation: DotGlobeAnimation };

/** Every number any of the animations reads, plus how much of each is on screen. */
function targetsOf(s: Settings) {
  return {
    ...globeTargets(s),
    ...spinMotion.targets(s),
    ...cascadeMotion.targets(s),
    ...liftMotion.targets(s),
    ...tideMotion.targets(s),
    ...twistMotion.targets(s),
    ...scanMotion.targets(s),
    ...riseMotion.targets(s),
    ...sweepMotion.targets(s),
    ...compactMotion.targets(s),
    ...swarmMotion.targets(s),
    ...mixTargets(ANIMATIONS, s.animation),
  };
}

function scene() {
  return mixScenes({
    spin: spinMotion.scene,
    cascade: cascadeMotion.scene,
    lift: liftMotion.scene,
    tide: tideMotion.scene,
    twist: twistMotion.scene,
    scan: scanMotion.scene,
    rise: riseMotion.scene,
    sweep: sweepMotion.scene,
    compact: compactMotion.scene,
    swarm: swarmMotion.scene,
  });
}

export function DotGlobe({
  animation = "spin",
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration,
  gap,
  stagger,
  direction,
  from,
  lift,
  depth,
  width,
  moves,
  waves,
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotGlobeProps) {
  const active = ANIMATIONS.includes(animation) ? animation : "spin";
  const motion = withDefaults({ ...DEFAULTS, ...ANIMATION_DEFAULTS[active] }, { duration, gap, stagger, direction, from, lift, depth, width, moves, waves });
  const settings: Settings = { animation: active, pattern, dotSize, density, size, tilt, color, backOpacity, paused, ...motion };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={scene} label={label} {...rest} />;
}

export default DotGlobe;
