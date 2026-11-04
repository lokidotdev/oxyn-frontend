"use client";
// Adapted from beui.dev/components/motion/range-slider, at half height.

import {
  animate,
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SPRING_GLIDE } from "#/shared/lib/ease";
import { type SliderOptions, useSlider } from "#/shared/lib/use-slider";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "#/shared/lib/touch";
import { cn } from "#/shared/lib/cn";

const STOP_COUNT = 10;
const HANDLE_START = 8;
const HANDLE_END_INSET = 12;
// Matches RangeSlider's bouncy grab and release feedback.
const SPRING_BOUNCY = { type: "spring", stiffness: 500, damping: 14, mass: 0.7 } as const;

export interface InlineSliderProps extends SliderOptions {
  /** Sets the value's decimal precision and the arrow-key increment. Values are not snapped to it. */
  step?: number;
  /** Label shown above the track. */
  label: string;
  /** Formats the inline value without changing its precision. */
  format?: (value: number) => string;
  /** Show ten evenly spaced guide markers along the track. */
  showTicks?: boolean;
  className?: string;
}

/** An always-visible inline slider with an inset fill and a thumb that parts
 * around its labels, keeping their text readable as the handle passes them. */
export function InlineSlider({
  label,
  format = String,
  showTicks = true,
  className,
  ...options
}: InlineSliderProps) {
  const reduce = useReducedMotion();
  const step = options.step && options.step > 0 ? options.step : 1;
  const precision = step.toFixed(6).replace(/0+$/, "").split(".")[1]?.length ?? 0;
  const { current, min, max, commit, trackProps, sliderProps } = useSlider({
    ...options,
    step: 10 ** -precision,
    "aria-label": options["aria-label"] ?? label,
    formatValueText: options.formatValueText ?? format,
  });
  const [width, setWidth] = useState(292);
  const [dragging, setDragging] = useState(false);
  const dragFrame = useRef<number | null>(null);
  const pendingDragValue = useRef<number | null>(null);
  const gesture = useRef<{
    id: number;
    left: number;
    offset: number;
    x: number;
  } | null>(null);

  useLayoutEffect(() => {
    const track = trackProps.ref.current;
    if (!track) return;
    const measure = () => {
      const next = track.getBoundingClientRect().width;
      if (next) setWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [trackProps.ref]);

  // Value and thumb position map linearly across the track, so any value is reachable.
  const endX = Math.max(HANDLE_START, width - HANDLE_END_INSET);
  const span = endX - HANDLE_START;
  const clampX = (x: number) => Math.min(endX, Math.max(HANDLE_START, x));
  const toValue = (x: number) =>
    max === min ? min : min + ((clampX(x) - HANDLE_START) / span) * (max - min);
  const restingX = max === min
    ? HANDLE_START
    : HANDLE_START + ((Math.min(max, Math.max(min, current)) - min) / (max - min)) * span;
  // One motion value owns the thumb for the entire gesture. Pointer movement
  // writes pixels directly; only release/click/keyboard changes use a spring.
  // Never derive dragging pixels from a rounded value or swap to a lagging spring.
  const handleX = useMotionValue(restingX);
  const restingTarget = useRef(restingX);
  const settleTo = useCallback((x: number) => {
    restingTarget.current = x;
    handleX.jump(handleX.get());
    if (reduce) handleX.jump(x);
    else animate(handleX, x, { type: "spring", ...SPRING_GLIDE });
  }, [handleX, reduce]);
  useLayoutEffect(() => {
    if (gesture.current || restingTarget.current === restingX) return;
    settleTo(restingX);
  }, [restingX, settleTo]);
  useEffect(() => () => {
    handleX.stop();
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
  }, [handleX]);
  const fillRight = useTransform(handleX, (x) =>
    x >= endX ? width - 2 : x + 8,
  );
  // Slide a fixed-size fill inside the inset clipping window. The dots stay
  // above it, and only transforms animate.
  const fillX = useTransform(fillRight, (right) => right - width + 2);
  const ticks = useMemo(() => showTicks
    ? Array.from({ length: STOP_COUNT }, (_, index) => HANDLE_START + (index / (STOP_COUNT - 1)) * span)
    : [], [showTicks, span]);

  const queueDragCommit = (value: number) => {
    pendingDragValue.current = value;
    if (dragFrame.current !== null) return;
    dragFrame.current = requestAnimationFrame(() => {
      dragFrame.current = null;
      if (pendingDragValue.current !== null) commit(pendingDragValue.current);
      pendingDragValue.current = null;
    });
  };

  const cancelDragCommit = () => {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    pendingDragValue.current = null;
  };

  const endGesture = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    // Clear before releasing capture: its lost-capture event must not commit twice.
    gesture.current = null;
    cancelDragCommit();
    setDragging(false);
    if (!options.disabled && width > 0) {
      const x = clampX(event.type === "pointerup"
        ? event.clientX - active.left - active.offset
        : active.x);
      // Stay where released: a drag already sits there, a track click glides there.
      commit(toValue(x));
      settleTo(x);
    } else {
      settleTo(restingX);
    }
    releasePointer(event.currentTarget, event.pointerId);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-xs text-fg tabular-nums">{format(current)}</span>
      </div>
      <div
        {...trackProps}
        onPointerDown={(event) => {
          if (options.disabled || event.button !== 0 || gesture.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (!rect.width) return;
          event.preventDefault();
          const pointerX = event.clientX - rect.left;
          const thumbX = handleX.get();
          // Grabbing the thumb preserves the exact grab point. A track click
          // waits for release, then glides to the clicked point.
          const offset = Math.abs(pointerX - thumbX - 2) <= 12 ? pointerX - thumbX : 2;
          gesture.current = { id: event.pointerId, left: rect.left, offset, x: thumbX };
          setDragging(true);
          handleX.stop();
          cancelDragCommit();
          capturePointer(event.currentTarget, event.pointerId);
          event.currentTarget.querySelector<HTMLButtonElement>("[role=slider]")?.focus({ preventScroll: true });
        }}
        onPointerMove={(event) => {
          const active = gesture.current;
          if (!active || active.id !== event.pointerId || options.disabled) return;
          const x = clampX(event.clientX - active.left - active.offset);
          active.x = x;
          handleX.set(x);
          queueDragCommit(toValue(x));
        }}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onLostPointerCapture={endGesture}
        className={cn(
          "relative h-5 w-full touch-none select-none overflow-hidden rounded-md bg-raised",
          TOUCH_GESTURE_CLASS,
          options.disabled
            ? "pointer-events-none opacity-50"
            : "cursor-ew-resize",
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[2px] inset-y-0 overflow-hidden rounded-md"
        >
          <m.div
            className="absolute inset-0 rounded-md bg-fg/15"
            style={{ x: fillX }}
          />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-fg">
          {ticks.map((left) => (
            <span
              key={left}
              className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-fg/25"
              style={{ left }}
            />
          ))}
        </div>
        <m.div
          aria-hidden="true"
          animate={reduce ? undefined : { scaleY: dragging ? 1.35 : 1 }}
          transition={SPRING_BOUNCY}
          className="pointer-events-none absolute left-0 top-1 h-3 w-1 rounded-full bg-fg"
          style={{ x: handleX }}
        />
        <button
          type="button"
          {...sliderProps}
          onKeyDown={(event) => {
            if (options.disabled) return;
            const next = {
              ArrowRight: Math.min(max, current + step),
              ArrowUp: Math.min(max, current + step),
              ArrowLeft: Math.max(min, current - step),
              ArrowDown: Math.max(min, current - step),
              Home: min,
              End: max,
              PageUp: max,
              PageDown: min,
            }[event.key];
            if (next !== undefined) {
              event.preventDefault();
              commit(next);
            }
          }}
          className="absolute inset-0 cursor-[inherit] touch-none rounded-md border-0 outline-none focus-visible:ring-1 focus-visible:ring-fg/40"
        />
      </div>
    </div>
  );
}
