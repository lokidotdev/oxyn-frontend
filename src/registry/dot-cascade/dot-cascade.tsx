"use client";

import type { HTMLAttributes } from "react";
import { LoaderCanvas } from "../lib/loader-canvas";
import { buildGlobe, drawGlobe, globeKey, globeTargets } from "../lib/globe";
import type { GlobeSettings } from "../lib/globe";
import { easeInOutCubic } from "../lib/ease";
import type { Scene } from "../lib/loader-canvas";

export type DotCascadePattern = "rings" | "fibonacci" | "grid";

export interface DotCascadeProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** How the dots are laid out on the sphere. */
  pattern?: DotCascadePattern;
  /** Diameter of the front-most dots in px. Back dots shrink automatically. */
  dotSize?: number;
  /** Number of rows / dot density. Higher = more dots. */
  density?: number;
  /** Canvas size in px (the orb is square). */
  size?: number;
  /** Seconds each row takes to complete its 360° turn. */
  duration?: number;
  /** Seconds between one row starting and the next row below it. */
  stagger?: number;
  /** Seconds the orb rests after the bottom row finishes, before the next wave. */
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

/** Seconds (roughly) a resting row takes to settle back square after a timing change knocked it off. */
const REALIGN = 0.12;

type Settings = GlobeSettings & Required<Pick<DotCascadeProps, "duration" | "stagger" | "gap" | "direction">>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return {
    ...globeTargets(s),
    duration: s.duration,
    stagger: s.stagger,
    gap: s.gap,
    // Spin velocity sign; flipping it slows turning rows, stops them, and turns them back the other way.
    dir: s.direction === "left" ? 1 : -1,
  };
}

type Key = keyof ReturnType<typeof targetsOf>;

function buildShape(s: Settings) {
  const globe = buildGlobe(s);
  const layers = globe.rows + 1;
  return {
    ...globe,
    layers,
    // Each row's spin angle, accumulated so timing changes mid-turn bend the motion instead of jumping it.
    angles: new Float64Array(layers),
    layerSin: new Float64Array(layers),
    layerCos: new Float64Array(layers).fill(1),
  };
}

type Shape = ReturnType<typeof buildShape>;

const shape = { key: globeKey, build: buildShape };

function scene(): Scene<Settings, Key, Shape> {
  // Position within the current wave (0–1), advanced by rate so pausing coasts to a stop.
  let phase = 0;

  return {
    advance(dt, { v, layers: onScreen }) {
      const shapes = onScreen.map((layer) => layer.shape);
      const turn = Math.max(0.05, v.duration);
      const stagger = Math.max(0, v.stagger);
      // Sized for the tallest orb on screen, so a fading-out orb's rows still finish their turn.
      const cycle = (Math.max(...shapes.map((shape) => shape.layers)) - 1) * stagger + turn + Math.max(0, v.gap);
      const settle = 1 - Math.exp(-dt / REALIGN);
      const from = phase;
      const to = phase + (dt * v.rate) / cycle;

      // Each row runs one eased 360° turn, starting `stagger` seconds after the row above.
      const progress = (p: number, l: number) => {
        const whole = Math.floor(p);
        return whole + Math.min(1, Math.max(0, ((p - whole) * cycle - l * stagger) / turn));
      };
      const turnsAt = (p: number, l: number) => {
        const x = progress(p, l);
        const whole = Math.floor(x);
        return whole + easeInOutCubic(x - whole);
      };

      for (const shape of shapes) {
        for (let l = 0; l < shape.layers; l++) {
          let a = shape.angles[l] + (turnsAt(to, l) - turnsAt(from, l)) * Math.PI * 2 * v.dir;
          a %= Math.PI * 2;
          const x = progress(to, l) % 1;
          // A row at rest belongs square to the orb; ease it back if a timing change left it skewed.
          if (x === 0) a -= (a - Math.PI * 2 * Math.round(a / (Math.PI * 2))) * settle;
          shape.angles[l] = a;
          shape.layerSin[l] = Math.sin(a);
          shape.layerCos[l] = Math.cos(a);
        }
      }
      phase = to % 1;
    },
    draw(ctx, frame) {
      drawGlobe(ctx, frame, frame.size / 2 - Math.max(0, frame.v.dotSize), ({ layerSin, layerCos }) => ({ x, y, z, row }, out) => {
        const sinA = layerSin[row];
        const cosA = layerCos[row];
        // Spin the row around the vertical axis.
        out.x = x * cosA + z * sinA;
        out.y = y;
        out.z = -x * sinA + z * cosA;
      });
    },
  };
}

export function DotCascade({
  pattern = "rings",
  dotSize = 3,
  density = 12,
  size = 160,
  duration = 1.4,
  stagger = 0.08,
  gap = 0.6,
  direction = "left",
  tilt = 18,
  color = "#e4e4e7",
  backOpacity = 0.2,
  paused = false,
  label = "Thinking",
  ...rest
}: DotCascadeProps) {
  const settings: Settings = { pattern, dotSize, density, size, duration, stagger, gap, direction, tilt, color, backOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} shape={shape} scene={scene} label={label} {...rest} />;
}

export default DotCascade;
