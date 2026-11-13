"use client";

import type { HTMLAttributes } from "react";
import { ARC_ANIMATIONS, arcMixSettle, arcScene, arcShape, arcTargets } from "../lib/arcs";
import type { ArcAnimation, ArcSettings } from "../lib/arcs";
import { LoaderCanvas } from "../lib/loader-canvas";
import { mixTargets } from "../lib/mix";
import type { MixKey } from "../lib/mix";

export type ArcRingsAnimation = ArcAnimation;

export interface ArcRingsProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /**
   * Which animation the rings run: load, work, plan, assemble, process, run, think, search, write, parallel or transfer.
   * Changing it morphs the arcs from the old animation into the new one; every other prop keeps its value.
   */
  animation?: ArcRingsAnimation;
  /** Number of concentric rings (1–6). */
  lines?: number;
  /** Cuts in each ring (1–8). The ring is split into this many equal arcs. */
  cuts?: number;
  /** Angular width of each cut in degrees. */
  cutSpacing?: number;
  /** Gap between neighboring rings in px. */
  lineSpacing?: number;
  /** Stroke width of each ring in px. */
  lineWidth?: number;
  /** Pace of the animation, in turns per second of the outer ring at a steady spin. */
  speed?: number;
  /** Turn neighboring rings in opposite directions. */
  alternate?: boolean;
  /**
   * Calls still running (0–6), counting inward from the outer ring; the rings inside them close, dim and stop. Left out,
   * all run. Only parallel reads it.
   */
  active?: number;
  /**
   * How much has transferred (0–1), filling the outer ring clockwise from 12 o'clock. Leave it out to fill and empty on
   * a loop. Only transfer reads it.
   */
  progress?: number;
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Line color, any CSS color. */
  color?: string;
  /** Opacity of the innermost ring (0–1). The outer ring is always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = ArcSettings & { animation: ArcRingsAnimation };

/** Every number the drawing reads, plus how much of each animation is on screen. */
function targetsOf(s: Settings) {
  return { ...arcTargets(s), ...mixTargets(ARC_ANIMATIONS, s.animation) };
}

function scene() {
  // Every animation moves the same arcs, so a switch glides one pose into the next.
  return arcScene<Settings, MixKey<ArcRingsAnimation>>((v) => ({
    load: v.mix_load,
    work: v.mix_work,
    plan: v.mix_plan,
    assemble: v.mix_assemble,
    process: v.mix_process,
    run: v.mix_run,
    think: v.mix_think,
    search: v.mix_search,
    write: v.mix_write,
    parallel: v.mix_parallel,
    transfer: v.mix_transfer,
  }));
}

export function ArcRings({
  animation = "load",
  lines = 3,
  cuts = 3,
  cutSpacing = 30,
  lineSpacing = 8,
  lineWidth = 1.5,
  speed = 0.3,
  alternate = true,
  active,
  progress,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.4,
  paused = false,
  label = "Thinking",
  ...rest
}: ArcRingsProps) {
  const playing = ARC_ANIMATIONS.includes(animation) ? animation : "load";
  const settings: Settings = { animation: playing, lines, cuts, cutSpacing, lineSpacing, lineWidth, speed, alternate, active, progress, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={arcShape} settle={arcMixSettle} scene={scene} label={label} {...rest} />;
}

export default ArcRings;
