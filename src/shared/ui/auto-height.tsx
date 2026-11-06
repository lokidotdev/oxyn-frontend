import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '#/shared/lib/cn'

const HEIGHT_SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const

/** Springs its height to fit its content whenever the content resizes, instead of jumping. */
export function AutoHeight({ children, className }: { children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    let last = inner.offsetHeight
    let anim: ReturnType<typeof animate> | undefined
    const observer = new ResizeObserver(() => {
      const next = inner.offsetHeight
      if (next === last) return
      // The observer fires after layout, so an unpinned outer box already has the new height: start from the
      // last measured one. Mid-animation the box is pinned, so its on-screen height is where to retarget from.
      const from = outer.style.height ? outer.getBoundingClientRect().height : last
      last = next
      anim?.stop()
      if (reduce) return
      const current = animate(outer, { height: [from, next] }, HEIGHT_SPRING)
      anim = current
      // Hand control back to content once settled.
      current.then(() => {
        if (anim === current) outer.style.height = ''
      })
    })
    observer.observe(inner)
    return () => {
      observer.disconnect()
      anim?.stop()
    }
  }, [reduce])

  return (
    <div ref={outerRef} className={cn('overflow-hidden', className)}>
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
