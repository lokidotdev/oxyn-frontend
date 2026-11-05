import { easeInOutCubic } from "./ease";
import { drawGlobe } from "./globe";
import type { GlobeKey, GlobeShape } from "./globe";
import type { Frame, Scene, Values } from "./loader-canvas";

/**
 * Every way a dot sphere can move. Each motion turns its props into glide targets and runs a scene
 * over the shared globe geometry, so single loaders and the switchable DotGlobe draw the same thing.
 */

type GlobeFrame<K extends string> = Frame<unknown, K | GlobeKey, GlobeShape>;

/** Gap (s) at which a spin turn is fully eased; smaller gaps blend toward a linear spin, 0 being linear. */
const SPIN_EASE_GAP = 0.2;
/** Seconds (roughly) a resting row takes to settle back square after a timing change knocked it off. */
const CASCADE_REALIGN = 0.12;
/** Opacity a dot keeps at the deepest point of the tide, so sunken dots read as further inside. */
const TIDE_SUNK_OPACITY = 0.55;

export interface SpinSettings {
  duration: number;
  gap: number;
  direction: "left" | "right";
}

/** The whole orb spins on its vertical axis. */
export const spinMotion = {
  targets(s: SpinSettings) {
    return {
      duration: s.duration,
      gap: s.gap,
      // Spin velocity sign; flipping it slows the orb, stops it, and spins it back up the other way.
      dir: s.direction === "left" ? 1 : -1,
    };
  },
  scene(): Scene<unknown, "duration" | "gap" | "dir" | GlobeKey, GlobeShape> {
    type V = Values<"duration" | "gap" | "dir" | GlobeKey>;
    // Position within the current turn (0–1), advanced by rate so pausing coasts to a stop.
    let phase = 0;
    let angle = 0;

    /** Turns completed by cycle position `p` (which may run past 1), with the current timing. */
    const turnsAt = (p: number, v: V) => {
      const turn = Math.max(0.05, v.duration);
      const gap = Math.max(0, v.gap);
      const whole = Math.floor(p);
      const x = Math.min(1, ((p - whole) * (turn + gap)) / turn);
      // One turn per cycle, then rest for `gap`. With no gap the spin is linear
      // so consecutive turns join seamlessly.
      return whole + x + (easeInOutCubic(x) - x) * Math.min(1, gap / SPIN_EASE_GAP);
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
  },
};

export interface CascadeSettings {
  duration: number;
  stagger: number;
  gap: number;
  direction: "left" | "right";
}

/** The orb holds still while each row takes a full turn, one after another from the top. */
export const cascadeMotion = {
  targets(s: CascadeSettings) {
    return {
      duration: s.duration,
      stagger: s.stagger,
      gap: s.gap,
      // Spin velocity sign; flipping it slows turning rows, stops them, and turns them back the other way.
      dir: s.direction === "left" ? 1 : -1,
    };
  },
  scene(): Scene<unknown, "duration" | "stagger" | "gap" | "dir" | GlobeKey, GlobeShape> {
    // Position within the current wave (0–1), advanced by rate so pausing coasts to a stop.
    let phase = 0;

    return {
      advance(dt, { v, layers: onScreen }) {
        const shapes = onScreen.map((layer) => layer.shape);
        const turn = Math.max(0.05, v.duration);
        const stagger = Math.max(0, v.stagger);
        // Sized for the tallest orb on screen, so a fading-out orb's rows still finish their turn.
        const cycle = Math.max(...shapes.map((shape) => shape.rows)) * stagger + turn + Math.max(0, v.gap);
        const settle = 1 - Math.exp(-dt / CASCADE_REALIGN);
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
          for (let l = 0; l <= shape.rows; l++) {
            let a = shape.rowAngles[l] + (turnsAt(to, l) - turnsAt(from, l)) * Math.PI * 2 * v.dir;
            a %= Math.PI * 2;
            const x = progress(to, l) % 1;
            // A row at rest belongs square to the orb; ease it back if a timing change left it skewed.
            if (x === 0) a -= (a - Math.PI * 2 * Math.round(a / (Math.PI * 2))) * settle;
            shape.rowAngles[l] = a;
            shape.rowSin[l] = Math.sin(a);
            shape.rowCos[l] = Math.cos(a);
          }
        }
        phase = to % 1;
      },
      draw(ctx, frame) {
        drawGlobe(ctx, frame, frame.size / 2 - Math.max(0, frame.v.dotSize), ({ rowSin, rowCos }) => ({ x, y, z, row }, out) => {
          const sinA = rowSin[row];
          const cosA = rowCos[row];
          // Spin the row around the vertical axis.
          out.x = x * cosA + z * sinA;
          out.y = y;
          out.z = -x * sinA + z * cosA;
        });
      },
    };
  },
};

export interface LiftSettings {
  lift: number;
  duration: number;
  stagger: number;
  gap: number;
  from: "top" | "bottom";
}

/** The orb holds still while each ring pushes outward and settles back, one after another. */
export const liftMotion = {
  targets(s: LiftSettings) {
    return {
      lift: s.lift,
      duration: s.duration,
      stagger: s.stagger,
      gap: s.gap,
      // 0 runs the wave top to bottom, 1 bottom to top; gliding between them re-routes it smoothly.
      from: s.from === "bottom" ? 1 : 0,
    };
  },
  scene(): Scene<unknown, "lift" | "duration" | "stagger" | "gap" | "from" | GlobeKey, GlobeShape> {
    type F = GlobeFrame<"lift" | "duration" | "stagger" | "gap" | "from">;
    // Position within the current wave (0–1), advanced by rate so pausing coasts to a stop.
    let phase = 0;

    /** Seconds from the first ring leaving to the last one setting off, sized for the tallest orb on screen. */
    const spanOf = ({ v, layers }: F) => Math.max(...layers.map((layer) => layer.shape.steps)) * Math.max(0, v.stagger);
    const cycleOf = (frame: F) => spanOf(frame) + Math.max(0.05, frame.v.duration) + Math.max(0, frame.v.gap);

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
  },
};

export interface TideSettings {
  depth: number;
  width: number;
  duration: number;
  gap: number;
  from: "top" | "bottom";
}

/** A narrow wave travels down the orb, pulling a few rows inward as it passes. */
export const tideMotion = {
  targets(s: TideSettings) {
    return {
      depth: s.depth,
      width: s.width,
      duration: s.duration,
      gap: s.gap,
      // 0 runs the wave top to bottom, 1 bottom to top; gliding between them turns the tide smoothly.
      from: s.from === "bottom" ? 1 : 0,
    };
  },
  scene(): Scene<unknown, "depth" | "width" | "duration" | "gap" | "from" | GlobeKey, GlobeShape> {
    type V = Values<"depth" | "width" | "duration" | "gap" | "from" | GlobeKey>;
    // Position within the current sweep (0–1), advanced by rate so pausing coasts to a stop.
    let phase = 0;
    const cycleOf = (v: V) => Math.max(0.05, v.duration) + Math.max(0, v.gap);

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
            out.dim = 1 - (1 - TIDE_SUNK_OPACITY) * w * Math.min(1, sink * 4);
          };
        });
      },
    };
  },
};
