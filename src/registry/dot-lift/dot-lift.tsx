"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { drawGlobe, globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings, GlobeShape } from "../lib/globe";
import type { Frame, Scene } from "../lib/loader-canvas";

export type DotLiftPattern = "rings" | "fibonacci" | "grid";

export interface DotLiftProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The stagger follows it: ring by ring, row by row, or a stripe winding down the spiral. */
  pattern?: DotLiftPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** How far each ring pushes outward before settling back, as a fraction of the orb's radius. */
  lift?: number;
  /** Seconds each ring takes to push out and settle back into place. */
  duration?: number;
  /** Seconds between one ring starting and the next one along. Rings in motion at once ≈ duration ÷ stagger. */
  stagger?: number;
  /** Seconds the orb rests after the last ring settles, before the next wave. */
  gap?: number;
  /** Which end of the orb the wave starts from. */
  from?: "top" | "bottom";
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

type Settings = GlobeSettings & Required<Pick<DotLiftProps, "lift" | "duration" | "stagger" | "gap" | "from">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return {
    ...globeTargets(s),
    lift: s.lift,
    duration: s.duration,
    stagger: s.stagger,
    gap: s.gap,
    // 0 runs the wave top to bottom, 1 bottom to top; gliding between them re-routes it smoothly.
    from: s.from === "bottom" ? 1 : 0,
  };
}

type Key = keyof ReturnType<typeof targetsOf>;

function scene(): Scene<Settings, Key, GlobeShape> {
  // Position within the current wave (0–1), advanced by rate so pausing coasts to a stop.
  let phase = 0;

  /** Seconds from the first ring leaving to the last one setting off, sized for the tallest orb on screen. */
  const spanOf = ({ v, layers }: Frame<Settings, Key, GlobeShape>) =>
    Math.max(...layers.map((layer) => layer.shape.steps)) * Math.max(0, v.stagger);
  const cycleOf = (frame: Frame<Settings, Key, GlobeShape>) =>
    spanOf(frame) + Math.max(0.05, frame.v.duration) + Math.max(0, frame.v.gap);

  return {
    advance(dt, frame) {
      phase = (phase + (dt * frame.v.rate) / cycleOf(frame)) % 1;
    },
    draw(ctx, frame) {
      const { v, size } = frame;
      const lift = Math.max(0, v.lift);
      const fromBottom = v.from;
      const turn = Math.max(0.05, v.duration);
      const stagger = Math.max(0, v.stagger);
      const span = spanOf(frame);
      const now = phase * cycleOf(frame);
      // Leave headroom so a ring stays on the canvas at the peak of its push.
      const radius = (size / 2 - Math.max(0, v.dotSize)) / (1 + lift);

      drawGlobe(ctx, frame, radius, ({ steps }) => {
        // A shorter orb (fading out mid-change) starts later so both finish together.
        const lead = span - steps * stagger;
        return ({ x, y, z, step }, out) => {
          const d = step + (steps - 2 * step) * fromBottom;
          const t = Math.min(1, Math.max(0, (now - lead - d * stagger) / turn));
          // Push out and settle back on a sine bump: starts and lands at rest, no snap at either end.
          const s = 1 + lift * Math.sin(Math.PI * t) ** 2;
          // Only x and z scale: each ring widens or narrows around the vertical axis and never leaves its height.
          out.x = x * s;
          out.y = y;
          out.z = z * s;
        };
      });
    },
  };
}

export function DotLift({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  lift = 0.16,
  duration = 0.5,
  stagger = 0.14,
  gap = 0.5,
  from = "top",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotLiftProps) {
  const settings: Settings = { pattern, dotSize, density, size, lift, duration, stagger, gap, from, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} scene={scene} label={label} {...rest} />;
}

export default DotLift;
