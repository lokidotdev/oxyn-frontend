"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { drawGlobe, globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings, GlobeShape } from "../lib/globe";
import type { Scene, Values } from "../lib/loader-canvas";

export type DotTidePattern = "rings" | "fibonacci" | "grid";

export interface DotTideProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. The wave follows it: ring by ring, row by row, or a stripe winding down the spiral. */
  pattern?: DotTidePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** How far the wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius. */
  depth?: number;
  /** How many rows the wave pulls in at once. */
  width?: number;
  /** Seconds for the wave to travel from one pole to the other. */
  duration?: number;
  /** Seconds the orb rests after the wave leaves, before the next one. */
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

/** Opacity a dot keeps at the deepest point of the wave, so sunken dots read as further inside. */
const SUNK_OPACITY = 0.55;

type Settings = GlobeSettings & Required<Pick<DotTideProps, "depth" | "width" | "duration" | "gap" | "from">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return {
    ...globeTargets(s),
    depth: s.depth,
    width: s.width,
    duration: s.duration,
    gap: s.gap,
    // 0 runs the wave top to bottom, 1 bottom to top; gliding between them turns the tide smoothly.
    from: s.from === "bottom" ? 1 : 0,
  };
}

type Key = keyof ReturnType<typeof targetsOf>;

function scene(): Scene<Settings, Key, GlobeShape> {
  // Position within the current sweep (0–1), advanced by rate so pausing coasts to a stop.
  let phase = 0;
  const cycleOf = (v: Values<Key>) => Math.max(0.05, v.duration) + Math.max(0, v.gap);

  return {
    advance(dt, { v }) {
      phase = (phase + (dt * v.rate) / cycleOf(v)) % 1;
    },
    draw(ctx, frame) {
      const { v, size } = frame;
      const sink = Math.min(0.9, Math.max(0, v.depth));
      const half = Math.max(0.5, v.width) / 2;
      const fromBottom = v.from;
      const turn = Math.max(0.05, v.duration);
      // How far the wave has travelled this sweep (0–1); it holds at 1 through the gap, past the far pole.
      const travel = Math.min(1, (phase * cycleOf(v)) / turn);

      drawGlobe(ctx, frame, size / 2 - Math.max(0, v.dotSize), ({ steps }) => {
        // The wave's middle, in steps; it starts and ends fully off the orb so it enters and leaves softly.
        const mid = -half + travel * (steps + half * 2);
        return ({ x, y, z, step }, out) => {
          const d = step + (steps - 2 * step) * fromBottom;
          // 1 at the middle of the wave, easing to 0 `half` steps either side, so only a few rows move at once.
          const dist = Math.abs(d - mid) / half;
          const w = dist < 1 ? Math.cos((Math.PI / 2) * dist) ** 2 : 0;
          const s = 1 - sink * w;
          // Only x and z scale: each ring narrows toward the vertical axis and never leaves its height.
          out.x = x * s;
          out.y = y;
          out.z = z * s;
          // Pulled-in dots shrink and dim, so the wave reads as passing inside the orb.
          out.size = s;
          out.dim = 1 - (1 - SUNK_OPACITY) * w * Math.min(1, sink * 4);
        };
      });
    },
  };
}

export function DotTide({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  depth = 0.2,
  width = 3.5,
  duration = 1.6,
  gap = 0.4,
  from = "top",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotTideProps) {
  const settings: Settings = { pattern, dotSize, density, size, depth, width, duration, gap, from, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} scene={scene} label={label} {...rest} />;
}

export default DotTide;
