import type { SheetMotion } from "./sheet";

/**
 * Every way a flat dot sheet can move. Each motion turns its props into glide targets and says how
 * much each dot swells over time, so single loaders and the switchable DotSquare / DotCircle agree.
 */

export interface PulseSettings {
  duration: number;
  gap: number;
  ringWidth: number;
  direction: "out" | "in";
}

/** A ring of swollen dots spreads from the center to the edge (or closes in). */
export const pulseMotion = {
  targets(s: PulseSettings) {
    return {
      duration: s.duration,
      gap: s.gap,
      ringWidth: s.ringWidth,
      // 0 spreads out from the center, 1 closes in from the edge; between, the ring flattens across.
      inward: s.direction === "in" ? 1 : 0,
    };
  },
  cycle: (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap),
  swell: (t, v) => {
    const turn = Math.max(0.05, v.duration);
    const width = Math.max(0.05, v.ringWidth);
    const inward = v.inward;
    // The ring starts fully inside the center and ends fully past the edge, so
    // every dot gets one complete swell. During the gap it sits off-sheet.
    const ring = t < turn ? -width + (t / turn) * (1 + 2 * width) : Infinity;
    return ({ d }) => {
      const distance = d + (1 - 2 * d) * inward;
      const x = Math.abs(distance - ring) / width;
      // Cosine bump: 1 at the ring's center line, easing to 0 at its edges.
      return x < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * x) : 0;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "ringWidth" | "inward"> & { targets: unknown };

export interface BreathSettings {
  duration: number;
  gap: number;
  ripple: number;
}

/** Every dot grows and shrinks together, with an optional center-to-edge lag. */
export const breathMotion = {
  targets(s: BreathSettings) {
    return { duration: s.duration, gap: s.gap, ripple: s.ripple };
  },
  cycle: (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap) + Math.max(0, v.ripple),
  swell: (t, v) => {
    const breath = Math.max(0.05, v.duration);
    const ripple = Math.max(0, v.ripple);
    const cycle = breath + Math.max(0, v.gap) + ripple;
    return ({ d }) => {
      // Each dot runs the same breath, delayed by its distance from the center.
      const local = (((t - d * ripple) % cycle) + cycle) % cycle;
      // One cosine swell 0 → 1 → 0 across the breath, then rest at 0.
      return local < breath ? 0.5 - 0.5 * Math.cos((2 * Math.PI * local) / breath) : 0;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "ripple"> & { targets: unknown };

export interface WaveSettings {
  duration: number;
  gap: number;
  spread: number;
  direction: "right" | "left";
}

/** The sheet breathes in a sweep from one side to the other. */
export const waveMotion = {
  targets(s: WaveSettings) {
    return {
      duration: s.duration,
      gap: s.gap,
      spread: s.spread,
      // 0 travels right, 1 travels left; between, the sweep evens out before turning around.
      leftward: s.direction === "left" ? 1 : 0,
    };
  },
  cycle: (v) => Math.max(0.05, v.duration) + Math.max(0, v.gap) + Math.max(0, v.spread),
  swell: (t, v) => {
    const breath = Math.max(0.05, v.duration);
    const lag = Math.max(0, v.spread);
    const cycle = breath + Math.max(0, v.gap) + lag;
    const leftward = v.leftward;
    return ({ u }) => {
      // Each dot runs the same breath, delayed by how far across the sheet it sits.
      const across = (u + 1) / 2 - u * leftward;
      const local = (((t - across * lag) % cycle) + cycle) % cycle;
      // One cosine swell 0 → 1 → 0 across the breath, then rest at 0.
      return local < breath ? 0.5 - 0.5 * Math.cos((2 * Math.PI * local) / breath) : 0;
    };
  },
} satisfies SheetMotion<"duration" | "gap" | "spread" | "leftward"> & { targets: unknown };
