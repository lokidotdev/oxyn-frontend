import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '#/shared/lib/cn'
import { ChevronLeftIcon, ChevronRightIcon } from '#/shared/ui/icons'

/** Widest the edge fade gets, in px. It grows with how far there is left to scroll. */
const FADE = 64
/** Sub-pixel slack when deciding whether a tile is fully in view. */
const EPS = 1

interface ShapeRowProps {
  label: string
  /** Shown beside the label, e.g. a link to the row's group component. */
  aside?: ReactNode
  children: ReactNode
}

/**
 * A horizontally scrolling row of tiles. Tiles are sized so the next one peeks in at the
 * edge, the edges fade by how much is still hidden, and the arrows page through tiles.
 */
export function ShapeRow({ label, aside, children }: ShapeRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const sync = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const left = el.scrollLeft
    const rest = el.scrollWidth - el.clientWidth - left
    // Written straight to the element so scrolling never re-renders the row.
    el.style.setProperty('--fade-l', `${Math.min(Math.max(left, 0), FADE)}px`)
    el.style.setProperty('--fade-r', `${Math.min(Math.max(rest, 0), FADE)}px`)
    setCanLeft(left > EPS)
    setCanRight(rest > EPS)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sync])

  const scrollTo = (left: number) => {
    const el = scrollerRef.current
    if (!el) return
    // Clamp: some engines ignore a smooth scroll aimed past either end.
    const max = el.scrollWidth - el.clientWidth
    el.scrollTo({ left: Math.min(Math.max(left, 0), max), behavior: reduce ? 'auto' : 'smooth' })
  }

  const tiles = () => Array.from(scrollerRef.current?.children ?? []) as HTMLElement[]

  // Right: the last fully visible tile moves to the left edge.
  const next = () => {
    const el = scrollerRef.current
    if (!el) return
    const start = el.scrollLeft
    const end = start + el.clientWidth
    const all = tiles()
    const lastFull = all.findLast((t) => t.offsetLeft >= start - EPS && t.offsetLeft + t.offsetWidth <= end + EPS)
    // With one tile or less in full view, step to the next tile instead of standing still.
    const target =
      lastFull && lastFull.offsetLeft > start + EPS ? lastFull : all.find((t) => t.offsetLeft > start + EPS)
    if (target) scrollTo(target.offsetLeft)
  }

  // Left: the first fully visible tile moves to the right edge.
  const prev = () => {
    const el = scrollerRef.current
    if (!el) return
    const start = el.scrollLeft
    const end = start + el.clientWidth
    const all = tiles()
    const firstFull = all.find((t) => t.offsetLeft >= start - EPS && t.offsetLeft + t.offsetWidth <= end + EPS)
    const rightOf = (t: HTMLElement) => t.offsetLeft + t.offsetWidth
    const target =
      firstFull && rightOf(firstFull) < end - EPS ? firstFull : all.findLast((t) => rightOf(t) < end - EPS)
    if (target) scrollTo(rightOf(target) - el.clientWidth)
  }

  const arrow = 'grid size-7 place-items-center rounded-lg border border-line text-muted transition-colors'

  return (
    <section aria-label={label}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="font-mono text-xs text-faint">{label}</h2>
          {aside}
        </div>
        {(canLeft || canRight) && (
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label={`Scroll ${label} left`}
              disabled={!canLeft}
              onClick={prev}
              className={cn(arrow, canLeft ? 'hover:border-line-strong hover:text-fg' : 'opacity-40')}
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${label} right`}
              disabled={!canRight}
              onClick={next}
              className={cn(arrow, canRight ? 'hover:border-line-strong hover:text-fg' : 'opacity-40')}
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollerRef}
        onScroll={sync}
        className={cn(
          'relative flex gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // 1, 2 or 3 whole tiles plus a sliver of the next, so the row reads as scrollable.
          '[&>*]:w-[calc((100%-1rem)/1.2)] [&>*]:shrink-0 sm:[&>*]:w-[calc((100%-2rem)/2.25)] lg:[&>*]:w-[calc((100%-3rem)/3.25)]',
        )}
        style={{
          maskImage:
            'linear-gradient(to right, transparent 0, #000 var(--fade-l, 0px), #000 calc(100% - var(--fade-r, 0px)), transparent 100%)',
        }}
      >
        {children}
      </div>
    </section>
  )
}
