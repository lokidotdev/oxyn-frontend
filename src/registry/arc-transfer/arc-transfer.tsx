"use client";

import type { HTMLAttributes } from "react";
import { arcScene, arcSettle, arcShape, arcTargets, soloArc } from "../lib/arcs";
import type { ArcSettings } from "../lib/arcs";
import { LoaderCanvas } from "../lib/loader-canvas";

export interface ArcTransferProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /** How much has transferred (0–1), filling the outer ring clockwise from 12 o'clock. Leave it out to fill and empty on a loop. */
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

function scene() {
  const motion = soloArc("transfer");
  return arcScene<ArcSettings, never>(() => motion);
}

export function ArcTransfer({
  lines = 3,
  cuts = 3,
  cutSpacing = 30,
  lineSpacing = 8,
  lineWidth = 1.5,
  speed = 0.3,
  alternate = true,
  progress,
  size = 160,
  color = "#e4e4e7",
  minOpacity = 0.4,
  paused = false,
  label = "Uploading",
  ...rest
}: ArcTransferProps) {
  const settings: ArcSettings = { lines, cuts, cutSpacing, lineSpacing, lineWidth, speed, alternate, progress, size, color, minOpacity, paused };
  return <LoaderCanvas settings={settings} targets={arcTargets} shape={arcShape} settle={arcSettle} scene={scene} label={label} {...rest} />;
}

export default ArcTransfer;
