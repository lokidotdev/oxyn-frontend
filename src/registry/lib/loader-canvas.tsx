import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import { PAUSE_SETTLE, SETTLE, glide, snap, stepGlide } from "./glide";
import type { Glide } from "./glide";

/** The glided value of every target, plus the canvas `size` and the pause `rate` (0 paused, 1 running). */
export type Values<K extends string> = Record<K | "size" | "rate", number>;

/** What a scene sees each frame. `layers` holds every shape on screen; more than one while a change cross-fades. */
export interface Frame<S, K extends string, L> {
  settings: S;
  v: Values<K>;
  layers: { shape: L; fade: number }[];
  size: number;
}

export interface Scene<S, K extends string, L> {
  /** Moves the scene's own clock on by `dt` seconds. Scale by `v.rate` so pausing coasts to a stop. */
  advance?(dt: number, frame: Frame<S, K, L>): void;
  /** Paints one frame onto a cleared canvas, already scaled to `size` px. */
  draw(ctx: CanvasRenderingContext2D, frame: Frame<S, K, L>): void;
}

export interface LoaderCanvasProps<S extends { size: number; paused: boolean }, K extends string, L>
  extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** The latest props. Read by `targets` and `shape` on every render, and by the scene every frame. */
  settings: S;
  /** Every number the scene reads, as the latest settings want it. Each glides to its new value. */
  targets: (s: NoInfer<S>) => Record<K, number>;
  /** Geometry rebuilt when its key changes; the old shape fades out while the new one fades in. */
  shape?: { key: (s: NoInfer<S>) => string; build: (s: NoInfer<S>) => L };
  /** Called once on mount; the returned scene keeps its own clock between frames. */
  scene: () => Scene<NoInfer<S>, K, L>;
  label: string;
}

/**
 * A square canvas that runs a scene: props glide instead of jumping, pausing coasts, shape changes
 * cross-fade, reduced motion holds still, and the loop sleeps once nothing is moving.
 */
export function LoaderCanvas<S extends { size: number; paused: boolean }, K extends string, L>({
  settings,
  targets,
  shape,
  scene,
  label,
  className,
  style,
  ...rest
}: LoaderCanvasProps<S, K, L>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only the first size reaches the DOM through React; after that the loop glides it.
  const [initialSize] = useState(settings.size);
  const latest = useRef({ settings, targets, shape, scene });
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    latest.current = { settings, targets, shape, scene };
    wakeRef.current?.();
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrapper || !canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const { settings: first, shape: shapeOf, scene: makeScene } = latest.current;
    const sceneNow = makeScene();
    const glides = {} as Record<string, Glide>;
    const v = {} as Values<K>;
    let shapes = shapeOf ? [{ key: shapeOf.key(first), shape: shapeOf.build(first), fade: glide(1) }] : [];
    const frameInfo: Frame<S, K, L> = { settings: first, v, layers: [], size: 1 };
    let shownSize = -1;
    let frame = 0;
    let last = 0;

    const targetsNow = () => {
      const { settings: s, targets } = latest.current;
      return { ...targets(s), size: s.size, rate: s.paused ? 0 : 1 } as Record<string, number>;
    };
    for (const [k, value] of Object.entries(targetsNow())) glides[k] = glide(value);

    /** Refreshes what the scene reads from the glides and shapes. */
    const read = () => {
      for (const k in glides) (v as Record<string, number>)[k] = glides[k].value;
      frameInfo.settings = latest.current.settings;
      frameInfo.layers = shapes.map(({ shape, fade }) => ({ shape, fade: fade.value }));
      frameInfo.size = Math.max(1, v.size);
    };

    const sync = () => {
      const { settings: s, shape: shapeOf } = latest.current;
      for (const [k, value] of Object.entries(targetsNow())) glides[k].target = value;
      if (shapeOf) {
        const key = shapeOf.key(s);
        if (key !== shapes[shapes.length - 1].key) {
          for (const shape of shapes) shape.fade.target = 0;
          const fade = glide(0);
          fade.target = 1;
          shapes.push({ key, shape: shapeOf.build(s), fade });
        }
      }
      // Reduced motion: hold still and apply changes at once.
      if (reduceMotion.matches) {
        glides.rate.target = 0;
        for (const g of Object.values(glides)) snap(g);
        for (const shape of shapes) snap(shape.fade);
      }
    };

    const draw = () => {
      read();
      const size = frameInfo.size;
      if (size !== shownSize) {
        shownSize = size;
        wrapper.style.width = wrapper.style.height = `${size}px`;
        canvas.style.width = canvas.style.height = `${size}px`;
        const px = Math.round(size * dpr);
        if (canvas.width !== px) canvas.width = canvas.height = px;
      }
      ctx.setTransform(canvas.width / size, 0, 0, canvas.width / size, 0, 0);
      ctx.clearRect(0, 0, size, size);
      sceneNow.draw(ctx, frameInfo);
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      let moving = false;
      for (const [k, g] of Object.entries(glides)) if (stepGlide(g, dt, k === "rate" ? PAUSE_SETTLE : SETTLE)) moving = true;
      for (const shape of shapes) if (stepGlide(shape.fade, dt, SETTLE)) moving = true;
      shapes = shapes.filter((shape) => shape.fade.target > 0 || shape.fade.value > 0);

      if (sceneNow.advance) {
        read();
        sceneNow.advance(dt, frameInfo);
      }
      draw();
      // Sleep once everything has settled and the animation is paused.
      frame = moving || glides.rate.value > 0 ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      sync();
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    wakeRef.current = wake;
    reduceMotion.addEventListener("change", wake);
    sync();
    draw();
    wake();
    return () => {
      cancelAnimationFrame(frame);
      wakeRef.current = null;
      reduceMotion.removeEventListener("change", wake);
    };
  }, []);

  const wrapperStyle: CSSProperties = { width: initialSize, height: initialSize, ...style };

  return (
    <div ref={wrapperRef} role="status" aria-label={label} className={className} style={wrapperStyle} {...rest}>
      <canvas ref={canvasRef} style={{ width: initialSize, height: initialSize, display: "block" }} />
    </div>
  );
}
