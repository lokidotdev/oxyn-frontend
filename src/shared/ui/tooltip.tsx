import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EASE_OUT } from '#/shared/lib/ease'

// A small tooltip: opens after a short delay on hover or keyboard focus, and at once when another tooltip in the same
// provider closed moments ago, so scanning along a row of them doesn't wait each time.

const OPEN_DELAY_MS = 300

const SkipContext = createContext<{ skipDelay: number; lastClosed: { current: number } }>({ skipDelay: 0, lastClosed: { current: 0 } })

export function TooltipProvider({ skipDelay = 300, children }: { skipDelay?: number; children: ReactNode }) {
  const lastClosed = useRef(0)
  return <SkipContext.Provider value={{ skipDelay, lastClosed }}>{children}</SkipContext.Provider>
}

export function Tooltip({ content, side = 'top', children }: { content: ReactNode; side?: 'top' | 'bottom'; children: ReactNode }) {
  const { skipDelay, lastClosed } = useContext(SkipContext)
  const reduce = useReducedMotion()
  const id = useId()
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const show = useCallback(() => {
    clearTimeout(timer.current)
    const warm = Date.now() - lastClosed.current < skipDelay
    if (warm) setOpen(true)
    else timer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS)
  }, [lastClosed, skipDelay])
  const hide = useCallback(() => {
    clearTimeout(timer.current)
    setOpen((was) => {
      if (was) lastClosed.current = Date.now()
      return false
    })
  }, [lastClosed])

  const dy = side === 'top' ? 4 : -4
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <m.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: reduce ? 0 : dy, scale: reduce ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className={
              'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md bg-fg px-2 py-1 font-mono text-[11px] whitespace-nowrap text-bg shadow-card ' +
              (side === 'top' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top')
            }
          >
            {content}
          </m.span>
        )}
      </AnimatePresence>
    </span>
  )
}
