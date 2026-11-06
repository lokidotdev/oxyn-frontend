import { useEffect, useRef } from 'react'

const BOTTOM_GAP = 24

/**
 * Caps an element's height so its bottom edge never passes the viewport, measured from where it sits right now.
 * A fixed `100dvh - n` cap only fits once a sticky panel has stuck; before that the panel starts lower and its
 * tail hangs off-screen, so its inner scroll can't reach the last items without first scrolling the page.
 * Only applies while `query` matches (the sticky layout); otherwise the element keeps its natural height.
 */
export function useFitViewport<T extends HTMLElement>(query = '(min-width: 1024px)') {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mq = window.matchMedia(query)
    let frame = 0

    const fit = () => {
      frame = 0
      if (!mq.matches) {
        el.style.maxHeight = ''
        return
      }
      const top = Math.max(el.getBoundingClientRect().top, 0)
      el.style.maxHeight = `${window.innerHeight - top - BOTTOM_GAP}px`
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(fit)
    }

    fit()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    mq.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      mq.removeEventListener('change', schedule)
    }
  }, [query])

  return ref
}
