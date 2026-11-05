"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { cascadeMotion, liftMotion, spinMotion, tideMotion } from "../lib/globe-motions";
import type { CascadeSettings, LiftSettings, SpinSettings, TideSettings } from "../lib/globe-motions";
import { mixScenes, mixTargets, withDefaults } from "../lib/mix";

/**
 * - `spin`: the whole orb turns on its vertical axis.
 * - `cascade`: the orb holds still while each row takes a full turn, one after another.
 * - `lift`: each ring pushes outward and settles back, one after another.
 * - `tide`: a narrow wave travels down the orb, pulling a few rows inward as it passes.
 */
export type DotGlobeAnimation = "spin" | "cascade" | "lift" | "tide";

export type DotGlobePattern = "rings" | "fibonacci" | "grid";

export interface DotGlobeProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Which animation the orb runs. Changing it cross-fades from the old animation to the new one. */
  animation?: DotGlobeAnimation;
  /** How the dots are laid out on the sphere. Staggered and travelling animations follow it. */
  pattern?: DotGlobePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds for one turn (spin), one row's turn (cascade), one ring's push (lift) or one pole-to-pole sweep (tide). Defaults per animation. */
  duration?: number;
  /** Seconds to rest between loops. Defaults per animation. */
  gap?: number;
  /** cascade, lift: seconds between one row starting and the next one along. Defaults per animation. */
  stagger?: number;
  /** spin, cascade: spin direction around the vertical axis. */
  direction?: "left" | "right";
  /** lift, tide: which end of the orb the wave starts from. */
  from?: "top" | "bottom";
  /** lift: how far each ring pushes outward, as a fraction of the orb's radius. */
  lift?: number;
  /** tide: how far the wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** tide: how many rows the wave pulls in at once. */
  width?: number;
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

type Motion = SpinSettings & CascadeSettings & LiftSettings & TideSettings;

const ANIMATIONS: DotGlobeAnimation[] = ["spin", "cascade", "lift", "tide"];

const SHARED: Motion = { duration: 1.4, gap: 0.5, stagger: 0.08, direction: "left", from: "top", lift: 0.16, depth: 0.2, width: 3.5 };

/** Each animation's own timing, used for any prop that isn't passed. */
const DEFAULTS: Record<DotGlobeAnimation, Motion> = {
  spin: { ...SHARED, duration: 3, gap: 0 },
  cascade: { ...SHARED, duration: 1.4, stagger: 0.08, gap: 0.6 },
  lift: { ...SHARED, duration: 0.5, stagger: 0.14, gap: 0.5 },
  tide: { ...SHARED, duration: 1.6, gap: 0.4 },
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
    ...mixTargets(ANIMATIONS, s.animation),
  };
}

function scene() {
  return mixScenes({ spin: spinMotion.scene, cascade: cascadeMotion.scene, lift: liftMotion.scene, tide: tideMotion.scene });
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
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotGlobeProps) {
  const active = ANIMATIONS.includes(animation) ? animation : "spin";
  const motion = withDefaults(DEFAULTS[active], { duration, gap, stagger, direction, from, lift, depth, width });
  const settings: Settings = { animation: active, pattern, dotSize, density, size, tilt, color, backOpacity, paused, ...motion };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} scene={scene} label={label} {...rest} />;
}

export default DotGlobe;
