import { useEffect, useRef, useState } from 'react'

const N = 7
const PITCH = 10
const CENTER = (N - 1) / 2

/** The dot-matrix "o": dots whose distance from the center falls in the ring are lit, the rest stay a faint ghost grid. */
const DOTS = Array.from({ length: N * N }, (_, i) => {
  const x = i % N
  const y = Math.floor(i / N)
  const d = Math.hypot(x - CENTER, y - CENTER)
  return { x, y, lit: d >= 1.5 && d <= 3.3 }
})

/**
 * The oxyn mark. Hovering its link sweeps a band of rows out and back in, top to bottom, the way the loaders move.
 * Each pass runs to the end: leaving mid-pass lets it finish instead of snapping, and staying starts another.
 * Two identical keyframe names alternate so the next pass restarts the animation without a reflow.
 */
export function LogoMark({ size = 20 }: { size?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const hovered = useRef(false)
  const [pass, setPass] = useState<'a' | 'b' | null>(null)

  useEffect(() => {
    const link = ref.current?.closest('a')
    if (!link) return
    const canHover = matchMedia('(hover: hover) and (pointer: fine)')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const enter = () => {
      hovered.current = true
      if (canHover.matches && !reduce.matches) setPass((p) => p ?? 'a')
    }
    const leave = () => {
      hovered.current = false
    }
    link.addEventListener('pointerenter', enter)
    link.addEventListener('pointerleave', leave)
    return () => {
      link.removeEventListener('pointerenter', enter)
      link.removeEventListener('pointerleave', leave)
    }
  }, [])

  // The bottom row starts last, so its end is the end of the pass.
  const onAnimationEnd = (e: React.AnimationEvent) => {
    if ((e.target as Element).getAttribute('data-row') !== String(N - 1)) return
    setPass((p) => (hovered.current ? (p === 'a' ? 'b' : 'a') : null))
  }

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${N * PITCH} ${N * PITCH}`}
      aria-hidden="true"
      className="logo-mark"
      data-pass={pass ?? undefined}
      onAnimationEnd={onAnimationEnd}
    >
      {DOTS.map(({ x, y, lit }) => (
        <circle
          key={`${x}-${y}`}
          cx={x * PITCH + PITCH / 2}
          cy={y * PITCH + PITCH / 2}
          r={3.8}
          fill="currentColor"
          opacity={lit ? 1 : 0.12}
          data-row={lit ? y : undefined}
          style={lit ? { animationDelay: `${y * 90}ms` } : undefined}
        />
      ))}
    </svg>
  )
}
