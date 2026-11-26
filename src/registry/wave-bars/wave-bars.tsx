"use client";

import type { HTMLAttributes } from "react";
import { WAVE_ANIMATIONS, WAVE_TIMING, waveBlendSettle, waveScene, waveShape, waveTargets } from "../lib/waves";
import type { WaveAlign, WaveAnimation, WaveMix, WaveSettings } from "../lib/waves";
import { BLEND_SETTLE } from "../lib/glide";
import { LoaderCanvas } from "../lib/loader-canvas";
import { mixTargets } from "../lib/mix";
import type { MixKey } from "../lib/mix";

/**
 * - `think`: every bar sways on its own blend of slow waves, tallest in the middle, like a voice speaking.
 * - `idle`: the bars breathe together, a little from the middle out, barely rising.
 * - `process`: a steady wave marches left to right through every bar.
 * - `load`: each bar bounces in turn, left to right, then the row rests.
 * - `read`: a small wave scans left to right, lighting bars more than growing them.
 * - `write`: bars are typed left to right in bursts of three, each leaving a short mark, then wiped in order.
 * - `upload`: bars rise from their floor up to `progress`, the leading bar pulsing; with no `progress` it loops.
 * - `edit`: a cursor jumps between spots; the bar there pops and its neighbors ripple.
 * - `plan`: the row is cut into `steps` runs; done steps hold grown and the `current` one sweeps.
 * - `reason`: two waves set off from either end, cross in the middle and carry on.
 * - `search`: a narrow head hunts across the row, running ahead and backing up, then hunts its way back.
 * - `ping`: a pulse leaves the middle for both ends, waits, and comes back, like a request and its response.
 */
export type WaveBarsAnimation = WaveAnimation;

export interface WaveBarsProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Which animation the row runs. Changing it morphs the bars from the old animation into the new one; every other prop keeps its value. */
  animation?: WaveBarsAnimation;
  /** Number of bars in the row (3–32). */
  bars?: number;
  /** Width of each bar in px. Width and gap shrink together if the row would overflow. */
  barWidth?: number;
  /** Space between bars in px. */
  gap?: number;
  /** Corner radius of each bar in px; half the width makes pills. */
  radius?: number;
  /** Height of a resting bar in px. */
  minHeight?: number;
  /** Height of a bar at the peak of the motion in px. */
  maxHeight?: number;
  /** Seconds for one bar's motion (think, idle and process: one loop). Left out, each animation uses its own. */
  duration?: number;
  /** Seconds between one bar starting and the next. Left out, each animation uses its own. */
  stagger?: number;
  /** upload: how much has uploaded (0–1); leave it out to loop. */
  progress?: number;
  /** plan: steps in the plan (2–8). */
  steps?: number;
  /** plan: the step running now, counting from 0. */
  current?: number;
  /** Where the bars grow from: `center` up and down from the middle, `bottom` up from a shared floor. */
  align?: WaveAlign;
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Bar color, any CSS color. */
  color?: string;
  /** Opacity of resting bars (0–1). Bars at the peak are always 1. */
  minOpacity?: number;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}

type Settings = WaveSettings & { animation: WaveBarsAnimation };

/** Every number the drawing reads, plus how much of each animation is on screen. */
function targetsOf(s: Settings) {
  return { ...waveTargets(s), ...mixTargets(WAVE_ANIMATIONS, s.animation) };
}

function scene() {
  // Every animation lifts the same bars, so a switch glides each bar's lift from one animation into the next.
  // One weights object per loader, refilled each frame, so drawing allocates nothing.
  const mix: WaveMix = {};
  return waveScene<Settings, MixKey<WaveBarsAnimation>>((v) => {
    mix.think = v.mix_think;
    mix.idle = v.mix_idle;
    mix.process = v.mix_process;
    mix.load = v.mix_load;
    mix.read = v.mix_read;
    mix.write = v.mix_write;
    mix.upload = v.mix_upload;
    mix.edit = v.mix_edit;
    mix.plan = v.mix_plan;
    mix.reason = v.mix_reason;
    mix.search = v.mix_search;
    mix.ping = v.mix_ping;
    return mix;
  });
}

export function WaveBars({
  animation = "think",
  bars = 9,
  barWidth = 6,
  gap = 6,
  radius = 3,
  minHeight = 15,
  maxHeight = 60,
  duration,
  stagger,
  progress,
  steps = 3,
  current = 1,
  align = "center",
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.35,
  paused = false,
  label = "Loading",
  ...rest
}: WaveBarsProps) {
  const active = WAVE_ANIMATIONS.includes(animation) ? animation : "think";
  // Timing left out follows the animation, so each one moves at its own pace; a switch glides it across.
  const timing = WAVE_TIMING[active];
  const settings: Settings = {
    animation: active,
    bars,
    barWidth,
    gap,
    radius,
    minHeight,
    maxHeight,
    duration: duration ?? timing.duration,
    stagger: stagger ?? timing.stagger,
    progress,
    steps,
    current,
    align,
    size,
    color,
    minOpacity,
    paused,
  };
  // A switch moves each bar's lift on screen, so it takes the blend time. Built once and shared, not every render.
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={waveShape} settle={waveBlendSettle(BLEND_SETTLE)} scene={scene} label={label} {...rest} />;
}

export default WaveBars;
