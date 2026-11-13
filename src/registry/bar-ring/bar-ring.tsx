"use client";

import type { HTMLAttributes } from "react";
import { BAR_ANIMATIONS, barScene, barSettle, barShape, barTargets } from "../lib/bars";
import type { BarAnimation, BarDirection, BarSettings } from "../lib/bars";
import { BLEND_SETTLE } from "../lib/glide";
import { LoaderCanvas } from "../lib/loader-canvas";
import { mixTargets } from "../lib/mix";
import type { MixKey } from "../lib/mix";

/**
 * - `think`: the wave snaps each bar longer and lets it fall back slowly, so a bright head drags a fading tail.
 * - `parallel`: several evenly spaced waves travel round together (see `heads`).
 * - `read`: a small wave travels round at a steady pace, lighting bars more than moving them.
 * - `write`: bars are typed in bursts of four, each leaving a short mark, then the marks are wiped in order.
 * - `search`: the wave runs forward, backs up part of the way and runs on, like hunting for a match.
 * - `stream`: short pulses chase each other round with uneven gaps, like tokens arriving.
 * - `transfer`: bars fill clockwise to `progress`, the leading bar pulsing; with no `progress` it loops.
 * - `ping`: a pulse leaves 12 o'clock both ways, meets at 6, waits, and comes back, like a request and its response.
 * - `plan`: the ring is cut into `steps` segments; done steps hold grown and the `current` one sweeps.
 */
export type BarRingAnimation = BarAnimation;

export interface BarRingProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Which animation the ring runs. Changing it morphs the bars from the old animation into the new one; every other prop keeps its value. */
  animation?: BarRingAnimation;
  /** Number of bars around the ring (12–72). */
  bars?: number;
  /** Resting height of each bar in px, pointing out from the center. */
  barHeight?: number;
  /** Thickness of each bar in px. */
  barWidth?: number;
  /** Corner radius of each bar in px. */
  radius?: number;
  /** How far the animation pushes a bar, in px: by growing it or moving it. */
  extend?: number;
  /** Seconds one bar takes to move out and back (for fill, out or back). */
  duration?: number;
  /** Seconds between one bar starting and the next, going clockwise. */
  stagger?: number;
  /** Which way the push carries a bar: `out` away from the center, `in` toward it. */
  direction?: BarDirection;
  /** Waves travelling round the ring at once (1–4); only parallel uses it. */
  heads?: number;
  /** How much has transferred (0–1); leave it out to loop. Only transfer uses it. */
  progress?: number;
  /** Steps in the plan (2–8). Only plan uses it. */
  steps?: number;
  /** The plan step running now, counting from 0. Only plan uses it. */
  current?: number;
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Bar color, any CSS color. */
  color?: string;
  /** Opacity of resting bars (0–1). Bars at the peak of the push are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = BarSettings & { animation: BarRingAnimation };

/** Every number the drawing reads, plus how much of each animation is on screen. */
function targetsOf(s: Settings) {
  return { ...barTargets(s), ...mixTargets(BAR_ANIMATIONS, s.animation) };
}

function scene() {
  // Every animation pushes the same bars, so a switch glides each bar's push from one animation into the next.
  return barScene<Settings, MixKey<BarRingAnimation>>((v) => ({
    think: v.mix_think,
    parallel: v.mix_parallel,
    read: v.mix_read,
    write: v.mix_write,
    search: v.mix_search,
    stream: v.mix_stream,
    transfer: v.mix_transfer,
    ping: v.mix_ping,
    plan: v.mix_plan,
  }));
}

export function BarRing({
  animation = "read",
  bars = 36,
  barHeight = 12,
  barWidth = 2,
  radius = 1,
  extend = 10,
  duration = 0.32,
  stagger = 0.09,
  direction = "out",
  heads = 2,
  progress,
  steps = 4,
  current = 1,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Loading",
  ...rest
}: BarRingProps) {
  const active = BAR_ANIMATIONS.includes(animation) ? animation : "read";
  const settings: Settings = { animation: active, bars, barHeight, barWidth, radius, extend, duration, stagger, direction, heads, progress, steps, current, size, color, minOpacity, paused };
  // A switch moves each bar's push on screen, so it takes the blend time.
  const settle = { ...barSettle, ...Object.fromEntries(BAR_ANIMATIONS.map((a) => [`mix_${a}`, BLEND_SETTLE])) };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={barShape} settle={settle} scene={scene} label={label} {...rest} />;
}

export default BarRing;
