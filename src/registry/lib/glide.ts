/**
 * Glide times are a spring's time constant, not a duration: a glide is about 90% of the way to its target
 * after twice its time, so `SETTLE` reads as a ~240ms change.
 */

/** Seconds (roughly) a changed prop takes to glide to its new value: size, spacing, timing and the like. */
export const SETTLE = 0.12;
/** Color and opacity: faster, since nothing moves (~150ms). */
export const FADE_SETTLE = 0.075;
/** Changing animation: one motion blending into the next (~300ms). */
export const BLEND_SETTLE = 0.15;
/** Pausing: seconds (roughly) the animation takes to coast to a stop (~300ms). */
export const STOP_SETTLE = 0.15;
/** Resuming: seconds (roughly) the animation takes to get back up to speed (~400ms). */
export const START_SETTLE = 0.2;

/** A value that glides toward its target on a critically damped spring: no jump, no overshoot. */
export type Glide = { value: number; velocity: number; target: number };

export function glide(value: number): Glide {
  return { value, velocity: 0, target: value };
}

export function snap(g: Glide) {
  g.value = g.target;
  g.velocity = 0;
}

/** Moves `g` toward its target. Returns false once it has arrived and is at rest. */
export function stepGlide(g: Glide, dt: number, time: number) {
  if (g.value === g.target && g.velocity === 0) return false;
  const omega = 2 / time;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = g.value - g.target;
  const temp = (g.velocity + omega * change) * dt;
  g.velocity = (g.velocity - omega * temp) * decay;
  g.value = g.target + (change + temp) * decay;
  if (Math.abs(g.value - g.target) < 1e-3 && Math.abs(g.velocity) < 1e-3) snap(g);
  return true;
}
