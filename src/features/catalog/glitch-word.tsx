import { useEffect, useRef, useState } from 'react'

const WORDS = ['thinking', 'reading', 'writing', 'editing', 'searching', 'planning', 'reasoning', 'compiling', 'uploading', 'debugging', 'still']
const GLYPHS = '!<>-_\\/[]{}=+*^?#%01'
const HOLD_MS = 2200
const FRAME_MS = 40
const SCRAMBLE_FRAMES = 14

/** Cycles agent-state words, scrambling through glyphs on each swap. */
export function GlitchWord({ suffix = '' }: { suffix?: string }) {
  const [text, setText] = useState(WORDS[0])
  const [target, setTarget] = useState(WORDS[0])
  const [glitching, setGlitching] = useState(false)
  const [width, setWidth] = useState<number>()
  const sizer = useRef<HTMLSpanElement>(null)

  // The slot follows the incoming word's width, so the word stays centred on its line.
  // Observed rather than measured once, so a late web-font swap still lands right.
  useEffect(() => {
    const el = sizer.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let index = 0
    let frame: ReturnType<typeof setInterval> | undefined
    const hold = setInterval(() => {
      const from = WORDS[index]
      index = (index + 1) % WORDS.length
      const to = WORDS[index]
      const length = Math.max(from.length, to.length)
      let tick = 0
      setTarget(to)
      setGlitching(true)
      frame = setInterval(() => {
        tick++
        // Letters resolve left to right; unresolved slots show noise.
        const resolved = Math.floor((tick / SCRAMBLE_FRAMES) * length)
        let next = ''
        for (let i = 0; i < length; i++) {
          if (i < resolved) next += to[i] ?? ''
          else next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        }
        setText(next)
        if (tick >= SCRAMBLE_FRAMES) {
          clearInterval(frame)
          setText(to)
          setGlitching(false)
        }
      }, FRAME_MS)
    }, HOLD_MS)
    return () => {
      clearInterval(hold)
      clearInterval(frame)
    }
  }, [])

  return (
    <span className="glitch-word" data-text={text} data-glitching={glitching || undefined} style={{ width }}>
      <span className="sr-only">thinking{suffix}</span>
      {/* Invisible copy of the incoming word sets the slot width; before hydration it sizes the slot on its own. */}
      <span ref={sizer} aria-hidden="true" className="glitch-word-sizer">
        {target}
        {suffix}
      </span>
      <span aria-hidden="true" className="glitch-word-text">
        {text}
        {suffix}
      </span>
    </span>
  )
}
