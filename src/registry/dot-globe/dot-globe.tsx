"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import {
  ponderMotion,
  compactMotion,
  globeSettle,
  processMotion,
  transferMotion,
  readMotion,
  thinkMotion,
  parallelMotion,
  searchMotion,
  workMotion,
  reasonMotion,
} from "../lib/globe-motions";
import type {
  PonderSettings,
  CompactSettings,
  GlobeDirection,
  ProcessSettings,
  TransferSettings,
  ReadSettings,
  ThinkSettings,
  ParallelSettings,
  SearchSettings,
  WorkSettings,
  ReasonSettings,
} from "../lib/globe-motions";
import { mixScenes, mixTargets, withDefaults } from "../lib/mix";

/**
 * - `think`: the whole orb turns on its vertical axis.
 * - `ponder`: the orb holds still while each row takes a full turn, one after another.
 * - `process`: each ring pushes outward and settles back, one after another.
 * - `work`: a narrow wave travels down the orb, pulling a few rows inward as it passes.
 * - `reason`: the orb scrambles itself like a twisty cube, a row or column turn at a time, then solves itself.
 * - `read` (reading): a thin band of light reads down the orb at a steady pace.
 * - `transfer` (uploading / downloading): a wave pushes rows outward on its way up and fades them off the top, or pulls them inward on its way down.
 * - `search` (searching): one lit column sweeps around the orb like a radar, with a short fading trail.
 * - `compact` (compacting): two inward waves leave the poles, meet at the equator as a thin waist, and let go.
 * - `parallel` (parallel tool calls): several narrow waves travel down the orb at once, evenly spaced.
 */
export type DotGlobeAnimation = "think" | "ponder" | "process" | "work" | "reason" | "read" | "transfer" | "search" | "compact" | "parallel";

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
   * Seconds for one turn (think, reason, search), one row's turn (ponder), one ring's push (process), one pole-to-pole sweep
   * (work, read, transfer, parallel) or one squeeze (compact). Defaults to 1, or 0.5 for process, 2 for read and parallel, 2.4 for search and 1.8 for compact.
   */
  duration?: number;
  /** Seconds to rest between loops. reason: seconds the orb holds once scrambled, and again once solved. */
  gap?: number;
  /** ponder, process: seconds between one row starting and the next one along. Defaults to 0.1, or 0.14 for process. */
  stagger?: number;
  /** think, ponder, search: which way it turns around the vertical axis. transfer: "up" to upload (the default), "down" to download. */
  direction?: GlobeDirection;
  /** process, work: which end of the orb the wave starts from. */
  from?: "top" | "bottom";
  /** process, transfer, parallel: how far a ring pushes outward, as a fraction of the orb's radius. */
  lift?: number;
  /** work, transfer, compact, parallel: how far a wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** work, transfer: how many rows the wave moves at once. */
  width?: number;
  /** parallel: waves travelling down the orb at once (1–4), one per call running in parallel. */
  waves?: number;
  /** reason: turns in each scramble. The same turns then play back in reverse to solve the orb. */
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

type Motion = ThinkSettings &
  PonderSettings &
  ProcessSettings &
  WorkSettings &
  ReasonSettings &
  ReadSettings &
  TransferSettings &
  SearchSettings &
  CompactSettings &
  ParallelSettings;

const ANIMATIONS: DotGlobeAnimation[] = ["think", "ponder", "process", "work", "reason", "read", "transfer", "search", "compact", "parallel"];

/**
 * Used for any prop that isn't passed. The same for every animation, so switching animation changes nothing else.
 * transfer reads the shared "left" as its default, "up".
 */
const DEFAULTS: Motion = { duration: 1, gap: 0.4, stagger: 0.1, direction: "left", from: "top", lift: 0.16, depth: 0.2, width: 3.5, moves: 4, waves: 2 };

/**
 * Where the shared default would break an animation: at 1s / 0.1s process would push ~10 rings at once, not 3–4.
 * At 1s the read and parallel bands and the search's head pass each row in ~0.1s, too fast to read, and the
 * compact waves race to the waist.
 */
const ANIMATION_DEFAULTS: Partial<Record<DotGlobeAnimation, Partial<Motion>>> = {
  process: { duration: 0.5, stagger: 0.14 },
  read: { duration: 2 },
  search: { duration: 2.4 },
  compact: { duration: 1.8 },
  parallel: { duration: 2 },
};

type Settings = GlobeSettings & Motion & { animation: DotGlobeAnimation };

/** Every number any of the animations reads, plus how much of each is on screen. */
function targetsOf(s: Settings) {
  return {
    ...globeTargets(s),
    ...thinkMotion.targets(s),
    ...ponderMotion.targets(s),
    ...processMotion.targets(s),
    ...workMotion.targets(s),
    ...reasonMotion.targets(s),
    ...readMotion.targets(s),
    ...transferMotion.targets(s),
    ...searchMotion.targets(s),
    ...compactMotion.targets(s),
    ...parallelMotion.targets(s),
    ...mixTargets(ANIMATIONS, s.animation),
  };
}

function scene() {
  return mixScenes({
    think: thinkMotion.scene,
    ponder: ponderMotion.scene,
    process: processMotion.scene,
    work: workMotion.scene,
    reason: reasonMotion.scene,
    read: readMotion.scene,
    transfer: transferMotion.scene,
    search: searchMotion.scene,
    compact: compactMotion.scene,
    parallel: parallelMotion.scene,
  });
}

export function DotGlobe({
  animation = "think",
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
  const active = ANIMATIONS.includes(animation) ? animation : "think";
  const motion = withDefaults({ ...DEFAULTS, ...ANIMATION_DEFAULTS[active] }, { duration, gap, stagger, direction, from, lift, depth, width, moves, waves });
  const settings: Settings = { animation: active, pattern, dotSize, density, size, tilt, color, backOpacity, paused, ...motion };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} settle={globeSettle} scene={scene} label={label} {...rest} />;
}

export default DotGlobe;
