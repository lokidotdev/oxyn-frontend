import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { SPRING_GLIDE } from '#/shared/lib/ease'
import { DOT_COLOR, useTheme } from '#/shared/lib/theme'
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from '#/shared/lib/touch'
import { cn } from '#/shared/lib/cn'

interface Hsv { h: number; s: number; v: number }

const SIDE_OFFSET = 4
const COLLISION_PADDING = 12
const MIN_WIDTH = 232
/** A short, quiet set: the theme's dot color first, then a few hues at one lightness so none shouts over the others. */
const PRESETS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#60a5fa', '#a78bfa']

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b)
  let h = 0
  if (d) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, '0')
  }
  return `#${f(5)}${f(3)}${f(1)}`
}

/** Accepts `#abc`, `abc`, `#aabbcc` or `aabbcc`; anything else is null so the field can fall back. */
function parseHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(raw)) return `#${raw.replace(/./g, (c) => c + c)}`
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`
  return null
}

/** Drag on a surface with the pointer captured, reporting its 0–1 position on every move. */
function useSurfaceDrag(onMove: (x: number, y: number) => void) {
  const [dragging, setDragging] = useState(false)
  const rect = useRef<DOMRect | null>(null)
  const report = (event: PointerEvent<HTMLElement>) => {
    const r = rect.current
    if (r) onMove(clamp01((event.clientX - r.left) / r.width), clamp01((event.clientY - r.top) / r.height))
  }
  const end = (event: PointerEvent<HTMLElement>) => {
    if (!rect.current) return
    rect.current = null
    setDragging(false)
    releasePointer(event.currentTarget, event.pointerId)
  }
  return {
    dragging,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true })
        rect.current = event.currentTarget.getBoundingClientRect()
        setDragging(true)
        capturePointer(event.currentTarget, event.pointerId)
        // Responds on press: the thumb jumps under the pointer before any movement.
        report(event)
      },
      onPointerMove(event: PointerEvent<HTMLElement>) { if (rect.current) report(event) },
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
    },
  }
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${value}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        data-open={open || undefined}
        onPointerDown={(event) => {
          // Toggle on press, not release (Apple §1). Keyboard still goes through onClick.
          if (event.button !== 0) return
          event.preventDefault()
          setOpen((o) => !o)
        }}
        onClick={(event) => { if (event.detail === 0) setOpen((o) => !o) }}
        className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-left outline-none transition-colors hover:border-line-strong focus-visible:ring-1 focus-visible:ring-fg/40 data-[open]:border-line-strong"
      >
        <span className="size-5 shrink-0 rounded-md shadow-[inset_0_0_0_1px_oklch(0_0_0/0.18)]" style={{ background: value }} />
        <span className="font-mono text-xs uppercase text-fg tabular-nums">{value}</span>
      </button>
      <ColorPopover id={popoverId} open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} label={label} value={value} onChange={onChange} />
    </>
  )
}

function ColorPopover({ id, open, onClose, anchorRef, label, value, onChange }: {
  id: string
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement | null>
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number; width: number; side: 'bottom' | 'top' } | null>(null)

  const measure = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const width = Math.max(r.width, MIN_WIDTH)
    const height = panelRef.current?.offsetHeight ?? 300
    const below = window.innerHeight - r.bottom - SIDE_OFFSET - COLLISION_PADDING
    const side = below < height && r.top > below ? 'top' : 'bottom'
    const left = Math.min(Math.max(COLLISION_PADDING, r.left), window.innerWidth - width - COLLISION_PADDING)
    setPlace({ left, width, side, top: side === 'bottom' ? r.bottom + SIDE_OFFSET : r.top - SIDE_OFFSET - height })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!open) return
    measure()
    // Measure again once the panel has a real height, so a flip to the top lands exactly.
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const onDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !anchorRef.current?.contains(target)) onClose()
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onClose()
      anchorRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (typeof document === 'undefined') return null
  const fromTop = place?.side !== 'top'
  // Grows out of the trigger's edge and leaves the way it came (Apple §7), sharpening in like a material (§12).
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.96, y: fromTop ? -4 : 4, filter: 'blur(4px)' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          ref={panelRef}
          id={id}
          role="dialog"
          aria-label={`${label} picker`}
          initial={hidden}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ ...hidden, transition: reduce ? { duration: 0.08 } : { duration: 0.16, ease: [0.4, 0, 0.2, 1] } }}
          transition={reduce ? { duration: 0.08 } : { type: 'spring', ...SPRING_GLIDE }}
          style={{
            position: 'fixed',
            left: place?.left ?? -9999,
            top: place?.top ?? -9999,
            width: place?.width ?? MIN_WIDTH,
            transformOrigin: fromTop ? 'top left' : 'bottom left',
          }}
          className="z-50 rounded-xl border border-line-strong bg-raised p-2 shadow-xl shadow-black/40"
        >
          <PickerBody value={value} onChange={onChange} label={label} />
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function PickerBody({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const reduce = useReducedMotion()
  const dot = DOT_COLOR[useTheme()]
  // HSV is the source of truth while picking, so hue survives a drag through grey or black.
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const lastEmitted = useRef(value)
  if (value !== lastEmitted.current) {
    lastEmitted.current = value
    setHsv(hexToHsv(value))
  }
  const commit = (next: Hsv) => {
    setHsv(next)
    const hex = hsvToHex(next)
    lastEmitted.current = hex
    onChange(hex)
  }

  const area = useSurfaceDrag((x, y) => commit({ ...hsv, s: x, v: 1 - y }))
  const hue = useSurfaceDrag((x) => commit({ ...hsv, h: x * 360 }))
  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 })

  const nudge = (event: KeyboardEvent, axis: 'area' | 'hue') => {
    const step = event.shiftKey ? 0.1 : 0.01
    const dx = { ArrowRight: step, ArrowLeft: -step }[event.key] ?? 0
    const dy = { ArrowUp: step, ArrowDown: -step }[event.key] ?? 0
    if (!dx && !dy) return
    event.preventDefault()
    if (axis === 'area') commit({ ...hsv, s: clamp01(hsv.s + dx), v: clamp01(hsv.v + dy) })
    else commit({ ...hsv, h: Math.min(360, Math.max(0, hsv.h + (dx || dy) * 360)) })
  }

  const thumbScale = (dragging: boolean) => (reduce ? undefined : { scale: dragging ? 1.25 : 1 })

  return (
    <div className="space-y-2.5">
      {/* Saturation × brightness. Tracks the pointer 1:1 from the press (Apple §2). */}
      <div
        {...area.handlers}
        role="slider"
        tabIndex={0}
        aria-label={`${label} saturation and brightness`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onKeyDown={(event) => nudge(event, 'area')}
        className={cn(
          'relative h-36 w-full cursor-crosshair touch-none select-none rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-fg/40',
          TOUCH_GESTURE_CLASS,
        )}
        style={{
          backgroundColor: hueHex,
          backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_0_1px_oklch(0_0_0/0.12)]" />
        <m.span
          aria-hidden="true"
          animate={thumbScale(area.dragging)}
          transition={{ type: 'spring', ...SPRING_GLIDE }}
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_oklch(0_0_0/0.3),0_1px_3px_oklch(0_0_0/0.4)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv) }}
        />
      </div>

      {/* Hue: the same 20px track and 4×12 thumb as the inline slider, so it reads as one family. */}
      <div
        {...hue.handlers}
        role="slider"
        tabIndex={0}
        aria-label={`${label} hue`}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={(event) => nudge(event, 'hue')}
        className={cn(
          'relative h-5 w-full cursor-ew-resize touch-none select-none rounded-md outline-none focus-visible:ring-1 focus-visible:ring-fg/40',
          TOUCH_GESTURE_CLASS,
        )}
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <div className="pointer-events-none absolute inset-x-1.5 inset-y-0">
          <m.span
            aria-hidden="true"
            animate={reduce ? undefined : { scaleY: hue.dragging ? 1.35 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14, mass: 0.7 }}
            className="absolute top-1 h-3 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_oklch(0_0_0/0.3)]"
            style={{ left: `${(hsv.h / 360) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {[dot, ...PRESETS].map((preset, index) => {
          const active = preset === value
          return (
            <button
              key={preset}
              type="button"
              aria-label={index === 0 ? 'Theme default' : preset}
              aria-pressed={active}
              onClick={() => commit(hexToHsv(preset))}
              className={cn(
                'press aspect-square min-w-0 flex-1 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-fg/40',
                active
                  ? 'shadow-[0_0_0_1px_var(--color-raised),0_0_0_2px_var(--color-fg)]'
                  : 'shadow-[inset_0_0_0_1px_oklch(0_0_0/0.18)]',
              )}
              style={{ background: preset }}
            />
          )
        })}
      </div>

      <HexField value={value} onCommit={(hex) => commit(hexToHsv(hex))} label={label} />
    </div>
  )
}

function HexField({ value, onCommit, label }: { value: string; onCommit: (hex: string) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const parsed = draft === null ? value : parseHex(draft)
  const invalid = draft !== null && parsed === null

  const finish = () => {
    if (parsed && draft !== null) onCommit(parsed)
    setDraft(null)
  }

  return (
    <label className={cn(
      'flex h-8 items-center gap-2 rounded-lg border bg-bg px-2.5 transition-colors focus-within:border-line-strong',
      invalid ? 'border-glitch-a/60 focus-within:border-glitch-a/60' : 'border-line',
    )}>
      <span className="font-mono text-[11px] text-faint">HEX</span>
      <input
        aria-label={`${label} hex`}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        autoComplete="off"
        maxLength={7}
        value={(draft ?? value).toUpperCase()}
        onChange={(event) => {
          setDraft(event.target.value)
          // Live as soon as it's a full, valid color, so the loader updates while typing.
          const hex = parseHex(event.target.value)
          if (hex && event.target.value.replace('#', '').length === 6) onCommit(hex)
        }}
        onBlur={finish}
        onKeyDown={(event) => { if (event.key === 'Enter') finish() }}
        className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase text-fg tabular-nums outline-none"
      />
      <span className="size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_oklch(0_0_0/0.18)]" style={{ background: parsed ?? value }} />
    </label>
  )
}
