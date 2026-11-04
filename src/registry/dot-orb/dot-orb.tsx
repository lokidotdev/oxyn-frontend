"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { drawGlobe, globeShape, globeTargets } from "../lib/globe";
import type { GlobeSettings, GlobeShape } from "../lib/globe";
import { easeInOutCubic } from "../lib/ease";
import type { Scene, Values } from "../lib/loader-canvas";

export type DotOrbPattern = "rings" | "fibonacci" | "grid";

export interface DotOrbProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. */
  pattern?: DotOrbPattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds for one full 360° turn. */
  duration?: number;
  /** Seconds to rest between turns. 0 spins continuously; above 0 each turn eases in and out. */
  gap?: number;
  /** Spin direction around the vertical axis. */
  direction?: "left" | "right";
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

/** Gap (s) at which a turn is fully eased; smaller gaps blend toward a linear spin, 0 being linear. */
const EASE_GAP = 0.2;

type Settings = GlobeSettings & Required<Pick<DotOrbProps, "duration" | "gap" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return {
    ...globeTargets(s),
    duration: s.duration,
    gap: s.gap,
    // Spin velocity sign; flipping it slows the orb, stops it, and spins it back up the other way.
    dir: s.direction === "left" ? 1 : -1,
  };
}

type Key = keyof ReturnType<typeof targetsOf>;

function scene(): Scene<Settings, Key, GlobeShape> {
  // Position within the current turn (0–1), advanced by rate so pausing coasts to a stop.
  let phase = 0;
  let angle = 0;

  /** Turns completed by cycle position `p` (which may run past 1), with the current timing. */
  const turnsAt = (p: number, v: Values<Key>) => {
    const turn = Math.max(0.05, v.duration);
    const gap = Math.max(0, v.gap);
    const whole = Math.floor(p);
    const x = Math.min(1, ((p - whole) * (turn + gap)) / turn);
    // One turn per cycle, then rest for `gap`. With no gap the spin is linear
    // so consecutive turns join seamlessly.
    return whole + x + (easeInOutCubic(x) - x) * Math.min(1, gap / EASE_GAP);
  };

  return {
    advance(dt, { v }) {
      const cycle = Math.max(0.05, v.duration) + Math.max(0, v.gap);
      const next = phase + (dt * v.rate) / cycle;
      angle = (angle + (turnsAt(next, v) - turnsAt(phase, v)) * Math.PI * 2 * v.dir) % (Math.PI * 2);
      phase = next % 1;
    },
    draw(ctx, frame) {
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      drawGlobe(ctx, frame, frame.size / 2 - Math.max(0, frame.v.dotSize), () => ({ x, y, z }, out) => {
        // Spin around the vertical axis.
        out.x = x * cosA + z * sinA;
        out.y = y;
        out.z = -x * sinA + z * cosA;
      });
    },
  };
}

export function DotOrb({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 3,
  gap = 0,
  direction = "left",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotOrbProps) {
  const settings: Settings = { pattern, dotSize, density, size, duration, gap, direction, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={globeShape} scene={scene} label={label} {...rest} />;
}

export default DotOrb;
