"use client";

import type { HTMLAttributes } from "react";
import { colorTargets, rgb } from "../lib/color";
import { LoaderCanvas } from "../lib/loader-canvas";
import type { Scene } from "../lib/loader-canvas";

export interface ArcRingsProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** Turns per second of the outer ring. */
  speed?: number;
  /** Spin neighboring rings in opposite directions. */
  alternate?: boolean;
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

const TAU = Math.PI * 2;

type Settings = Required<
  Pick<
    ArcRingsProps,
    "lines" | "cuts" | "cutSpacing" | "lineSpacing" | "lineWidth" | "speed" | "alternate" | "size" | "color" | "minOpacity" | "paused"
  >
>;

/** Every number the drawing reads, as the latest props want it. */
function targetsOf(s: Settings) {
  return {
    ...colorTargets(s.color),
    lines: Math.min(6, Math.max(1, Math.round(s.lines))),
    cutSpacing: s.cutSpacing,
    lineSpacing: s.lineSpacing,
    lineWidth: s.lineWidth,
    speed: s.speed,
    // 1 = every ring spins the same way, -1 = neighbors counter-rotate. Gliding through 0 eases the switch.
    direction: s.alternate ? -1 : 1,
    minOpacity: s.minOpacity,
  };
}

type Key = keyof ReturnType<typeof targetsOf>;

function scene(): Scene<Settings, Key, never> {
  let turns = 0;

  return {
    advance(dt, { v }) {
      turns = (turns + dt * v.speed * v.rate) % 1;
    },
    draw(ctx, { v, size, settings }) {
      const lineWidth = Math.max(0, v.lineWidth);
      const spacing = Math.max(0, v.lineSpacing);
      const minOpacity = v.minOpacity;
      // A cut count can't be fractional, so it switches at once instead of gliding.
      const cuts = Math.min(8, Math.max(1, Math.round(settings.cuts)));
      const segment = TAU / cuts;
      const cut = Math.min(segment, (Math.max(0, v.cutSpacing) * Math.PI) / 180);
      // Fractional while gliding: the ring past the whole count fades in or out.
      const count = Math.max(1, v.lines);
      const center = size / 2;
      const outer = Math.max(1, center - lineWidth);

      ctx.strokeStyle = rgb(v);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";

      // Rings are counted inward from the outer edge, so adding one only touches the innermost.
      for (let j = 0; j < Math.ceil(count); j++) {
        const radius = outer - j * spacing;
        if (radius <= lineWidth / 2) break;
        const presence = Math.min(1, count - j);
        const k = Math.max(0, 1 - j / Math.max(1, count - 1)); // 1 = outer, 0 = innermost
        const spin = j % 2 === 0 ? 1 : v.direction;
        // Each ring starts half a segment on from its neighbor, so the cuts don't line up.
        const rotation = turns * TAU * spin + j * (segment / 2) - Math.PI / 2;

        ctx.globalAlpha = v.alpha * presence * (minOpacity + (1 - minOpacity) * k);
        ctx.beginPath();
        if (cut <= 0) {
          ctx.arc(center, center, radius, 0, TAU);
        } else {
          // Round caps reach past the arc's ends, so pull them back to keep the cut its real width.
          const cap = lineWidth / 2 / radius;
          const length = segment - cut - 2 * cap;
          if (length > 0) {
            for (let i = 0; i < cuts; i++) {
              const start = rotation + i * segment + cut / 2 + cap;
              ctx.moveTo(center + Math.cos(start) * radius, center + Math.sin(start) * radius);
              ctx.arc(center, center, radius, start, start + length);
            }
          }
        }
        ctx.stroke();
      }
    },
  };
}

export function ArcRings({
  lines = 3,
  cuts = 3,
  cutSpacing = 30,
  lineSpacing = 8,
  lineWidth = 1.5,
  speed = 0.3,
  alternate = true,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.4,
  paused = false,
  label = "Thinking",
  ...rest
}: ArcRingsProps) {
  const settings: Settings = { lines, cuts, cutSpacing, lineSpacing, lineWidth, speed, alternate, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={targetsOf} scene={scene} label={label} {...rest} />;
}

export default ArcRings;
