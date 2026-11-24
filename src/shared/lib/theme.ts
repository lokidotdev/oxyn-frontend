import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'oxyn-theme'

/** Loader dot color per theme. Hex, because the color param and its input only take hex (docs/DESIGN.md §2). */
export const DOT_COLOR: Record<Theme, string> = {
  dark: '#e4e4e7',
  light: '#27272a',
}

/** Runs inline in <head> before paint: stored choice, else the system preference. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){}`

function read(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => 'dark')
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
}

/** Dot dissolve: fast out of the button, long soft settle at the far corners (the select menu's curve). */
const DISSOLVE_DURATION = 900
const DISSOLVE_EASE = cubicBezier(0.32, 0.72, 0, 1)
/** Grid pitch and the width of the ring where dots are still growing, in CSS px. */
const DOT_PITCH = 14
const DOT_BAND = 200
const FADE_DURATION = 200

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress (bisection on x; plenty for one curve a frame). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (t: number, a: number, b: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3
  return (x: number) => {
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 24; i++) {
      t = (lo + hi) / 2
      if (at(t, x1, x2) < x) lo = t
      else hi = t
    }
    return at(t, y1, y2)
  }
}

/**
 * The dissolve's mask at one moment, as an SVG data URL: a solid disc where the new theme has fully arrived,
 * ringed by a band of grid dots that grow from nothing at the front edge to touching at the disc. The dots sit on
 * a fixed grid, so they swell in place like the loaders' dot fields instead of sliding.
 */
function dissolveMask(x: number, y: number, front: number, w: number, h: number) {
  const solid = Math.max(0, front - DOT_BAND)
  const maxR = DOT_PITCH * 0.72 // just past half the cell diagonal, so full-size neighbours close every gap
  let d = ''
  for (let i = DOT_PITCH / 2; i < w; i += DOT_PITCH) {
    for (let j = DOT_PITCH / 2; j < h; j += DOT_PITCH) {
      const q = (front - Math.hypot(i - x, j - y)) / DOT_BAND
      if (q <= 0 || q >= 1) continue
      const r = Math.round(q * maxR * 10) / 10
      d += `M${i - r} ${j}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><circle cx='${x}' cy='${y}' r='${solid}'/><path d='${d}'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Runs the dissolve on the new snapshot. Each frame's mask is decoded before it's swapped in, so the previous mask
 * stays up while the next one loads and the reveal never blanks out; a slow frame just holds a frame longer.
 */
function dissolve(root: HTMLElement, x: number, y: number) {
  const w = innerWidth
  const h = innerHeight
  const reach = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + DOT_BAND
  const setMask = (value: string) => root.style.setProperty('--theme-mask', value)
  setMask('linear-gradient(transparent, transparent)')

  // Holds the transition open for the whole dissolve; the mask itself is driven per frame below.
  const hold = root.animate({ opacity: [1, 1] }, { duration: DISSOLVE_DURATION, pseudoElement: '::view-transition-new(root)' })
  const start = performance.now()
  let busy = false
  const frame = (now: number) => {
    const p = Math.min(1, (now - start) / DISSOLVE_DURATION)
    if (p >= 1) return setMask('none')
    if (!busy) {
      busy = true
      const url = dissolveMask(x, y, DISSOLVE_EASE(p) * reach, w, h)
      const img = new Image()
      img.src = url
      img
        .decode()
        .then(() => hold.playState === 'running' && setMask(`url("${url}")`))
        .catch(() => {})
        .finally(() => (busy = false))
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/**
 * Switches theme. Given an origin (the toggle's center), the new theme dissolves in from it through a growing dot
 * field, the same dots the loaders are made of, so the change reads as coming from the button instead of the whole
 * screen flashing (docs/DESIGN.md §9). Falls back to an instant switch where View Transitions aren't supported, and
 * to a short cross-fade under reduced motion.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  const root = document.documentElement
  if (!origin || typeof document.startViewTransition !== 'function') return applyTheme(theme)

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  // Pauses color transitions so the revealed area is already in its final colors (styles.css).
  root.dataset.themeSwitching = ''
  const transition = document.startViewTransition(() => applyTheme(theme))

  transition.ready
    .then(() => {
      if (!reduce) return dissolve(root, origin.x, origin.y)
      root.animate({ opacity: [0, 1] }, { duration: FADE_DURATION, easing: 'ease', pseudoElement: '::view-transition-new(root)' })
    })
    .catch(() => {})
  transition.finished.finally(() => {
    delete root.dataset.themeSwitching
    root.style.removeProperty('--theme-mask')
  })
}

/** The current theme's dot color, or the given one when the user picked their own. */
export function useDotColor(picked?: unknown): string {
  const dot = DOT_COLOR[useTheme()]
  return typeof picked === 'string' && picked !== DOT_COLOR.dark ? picked : dot
}
