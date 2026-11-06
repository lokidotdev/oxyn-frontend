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

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
}

/** The current theme's dot color, or the given one when the user picked their own. */
export function useDotColor(picked?: unknown): string {
  const dot = DOT_COLOR[useTheme()]
  return typeof picked === 'string' && picked !== DOT_COLOR.dark ? picked : dot
}
