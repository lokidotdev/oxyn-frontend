/** Seconds (roughly) a changed prop takes to glide to its new value. */
export const SETTLE = 0.16;
/** Seconds (roughly) pausing takes to coast to a stop, and resuming to get back up to speed. */
export const PAUSE_SETTLE = 0.3;

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
