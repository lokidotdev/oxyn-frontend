let probe: CanvasRenderingContext2D | null = null;

/** Resolves any CSS color to sRGB [r, g, b, a] by painting it into one pixel, so it can be blended. */
function parseColor(color: string): [number, number, number, number] {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return [228, 228, 231, 1];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000"; // An invalid color leaves fillStyle as it was, so start from a known one.
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** A CSS color as glide targets, so a color change blends instead of jumping. */
export function colorTargets(color: string) {
  const [red, green, blue, alpha] = parseColor(color);
  return { red, green, blue, alpha };
}

/** The blended color as an opaque CSS color; its alpha is applied per dot through globalAlpha. */
export function rgb(v: { red: number; green: number; blue: number }) {
  return `rgb(${v.red} ${v.green} ${v.blue})`;
}
