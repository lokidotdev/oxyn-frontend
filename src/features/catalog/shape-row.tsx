import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '#/shared/lib/cn'
import { ChevronLeftIcon, ChevronRightIcon } from '#/shared/ui/icons'

/** Widest the edge fade gets, in px. It grows with how far there is left to scroll. */
const FADE = 64
/** Sub-pixel slack when deciding whether a tile is fully in view. */
const EPS = 1
/** Scroller inset (p-1), offset by -m-1, so tile shadows aren't clipped. Tile math works in the inset frame. */
const PAD = 4

const pos = (t: HTMLElement) => t.offsetLeft - PAD
const view = (el: HTMLElement) => el.clientWidth - 2 * PAD

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
  const [count, setCount] = useState(0)
  /** First and last tile in view. */
  const [range, setRange] = useState<[number, number]>([0, 0])

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
    // One dot per tile; every tile at least half in view lights its dot.
    const all = Array.from(el.children) as HTMLElement[]
    const shown = all.flatMap((t, i) => {
      const visible = Math.min(pos(t) + t.offsetWidth, left + view(el)) - Math.max(pos(t), left)
      return visible >= t.offsetWidth / 2 ? [i] : []
    })
    setCount(rest > EPS || left > EPS ? all.length : 0)
    setRange((r) => (r[0] === shown[0] && r[1] === shown.at(-1) ? r : [shown[0] ?? 0, shown.at(-1) ?? 0]))
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
    const end = start + view(el)
    const all = tiles()
    const lastFull = all.findLast((t) => pos(t) >= start - EPS && pos(t) + t.offsetWidth <= end + EPS)
    // With one tile or less in full view, step to the next tile instead of standing still.
    const target =
      lastFull && pos(lastFull) > start + EPS ? lastFull : all.find((t) => pos(t) > start + EPS)
    if (target) scrollTo(pos(target))
  }

  // Left: the first fully visible tile moves to the right edge.
  const prev = () => {
    const el = scrollerRef.current
    if (!el) return
    const start = el.scrollLeft
    const end = start + view(el)
    const all = tiles()
    const firstFull = all.find((t) => pos(t) >= start - EPS && pos(t) + t.offsetWidth <= end + EPS)
    const rightOf = (t: HTMLElement) => pos(t) + t.offsetWidth
    const target =
      firstFull && rightOf(firstFull) < end - EPS ? firstFull : all.findLast((t) => rightOf(t) < end - EPS)
    if (target) scrollTo(rightOf(target) - view(el))
  }

  const arrow = 'grid size-7 place-items-center rounded-lg bg-button shadow-card text-muted transition-[color,box-shadow]'

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
              className={cn(arrow, canLeft ? 'hover:shadow-card-hover hover:text-fg' : 'opacity-40')}
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${label} right`}
              disabled={!canRight}
              onClick={next}
              className={cn(arrow, canRight ? 'hover:shadow-card-hover hover:text-fg' : 'opacity-40')}
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
          'relative -m-1 flex gap-4 overflow-x-auto p-1 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
      {count > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${label}, item ${i + 1} of ${count}`}
              aria-current={i >= range[0] && i <= range[1] ? 'true' : undefined}
              onClick={() => {
                // Bring a hidden tile in at the nearer edge; one already in view stays put.
                const t = tiles()[i]
                const el = scrollerRef.current
                if (!t || !el) return
                if (i < range[0]) scrollTo(pos(t))
                else if (i > range[1]) scrollTo(pos(t) + t.offsetWidth - view(el))
              }}
              className="group grid h-4 place-items-center px-0.5"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-all duration-300',
                  i >= range[0] && i <= range[1] ? 'w-4 bg-fg' : 'w-1.5 bg-line-strong group-hover:bg-muted',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
