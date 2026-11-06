export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** A CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress 0..1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const curveX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const curveY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Newton's method finds the curve parameter whose x is `t`; bisection catches the flat spots.
    let s = t;
    for (let i = 0; i < 6; i++) {
      const dx = curveX(s) - t;
      const slope = slopeX(s);
      if (Math.abs(dx) < 1e-6) return curveY(s);
      if (Math.abs(slope) < 1e-6) break;
      s -= dx / slope;
    }
    let lo = 0;
    let hi = 1;
    s = t;
    for (let i = 0; i < 20; i++) {
      const x = curveX(s);
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return curveY(s);
  };
}

/** Strong ease-out, `cubic-bezier(0.23, 1, 0.32, 1)`: for things arriving or leaving. */
export const easeOut = cubicBezier(0.23, 1, 0.32, 1);
/** Strong ease-in-out, `cubic-bezier(0.77, 0, 0.175, 1)`: for things moving or morphing on screen. */
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1);
