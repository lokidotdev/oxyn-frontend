import { Link, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { groups } from '#/features/states'
import { cn } from '#/shared/lib/cn'
import { setTheme, useTheme } from '#/shared/lib/theme'
import { GitHubIcon, MoonIcon, SunIcon } from './icons'
import { LogoMark } from './logo-mark'

export const REPO_URL = 'https://github.com/lokidotdev/oxyn-frontend'

/** One nav entry per component group, named by its shape ("Dot Globe" → "Globe", "Arc Rings" → "Arc"). */
const NAV = groups.map((g) => ({ slug: g.slug, label: g.name.replace(/^Dot | Rings?$/g, '') }))

const linkClass = 'press group px-2 py-2 font-mono transition-colors hover:text-fg'
const iconButtonClass =
  'press grid place-items-center rounded-lg p-2 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fg/40'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Close the menu once navigation lands.
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="press -mx-2 flex items-center gap-2.5 px-2 py-2 text-sm font-medium tracking-tight">
          <LogoMark />
          <span>oxyn</span>
        </Link>
        {/* Centered on the bar itself, not in the space left between logo and actions. */}
        <nav aria-label="Components" className="absolute left-1/2 hidden -translate-x-1/2 items-center text-[13px] text-muted md:flex">
          {NAV.map((item) => (
            <Link
              key={item.slug}
              to="/components/$slug"
              params={{ slug: item.slug }}
              className={linkClass}
              activeProps={{ className: 'text-fg' }}
            >
              <span className="link-underline">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="-mr-2 flex items-center gap-1 text-[13px] text-muted">
          <GitHubStarButton />
          <ThemeToggle />
          <MenuButton open={open} onToggle={() => setOpen((o) => !o)} />
        </div>
      </div>
      <MobileMenu open={open} />
    </header>
  )
}

const REPO_API_URL = REPO_URL.replace('https://github.com/', 'https://api.github.com/repos/')

/** Compact star count: 1234 → "1.2k". */
const formatStars = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n))

function useStarCount() {
  const [stars, setStars] = useState<number | null>(null)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(REPO_API_URL, { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stargazers_count?: number } | null) => {
        if (typeof d?.stargazers_count === 'number') setStars(d.stargazers_count)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [])
  return stars
}

function GitHubStarButton() {
  const stars = useStarCount()
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={stars === null ? 'Star on GitHub' : `Star on GitHub (${stars} stars)`}
      className="press mr-1 flex h-8 items-center gap-1.5 rounded-lg bg-fg px-3 text-[13px] font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <GitHubIcon />
      <span>Star</span>
      {stars !== null && (
        <span className="ml-0.5 border-l border-bg/25 pl-2 font-mono tabular-nums">{formatStars(stars)}</span>
      )}
    </a>
  )
}

function MenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="mobile-menu"
      className={cn(iconButtonClass, 'md:hidden')}
    >
      {/* Two bars that fold into an X. */}
      <span className="relative block h-4 w-4" aria-hidden="true">
        {[-3, 3].map((y, i) => (
          <span
            key={y}
            className="absolute top-1/2 left-0.5 h-[1.5px] w-3 rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: open ? `translateY(-50%) rotate(${i ? -45 : 45}deg)` : `translateY(calc(-50% + ${y}px))` }}
          />
        ))}
      </span>
    </button>
  )
}

const SHEET_SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const

function MobileMenu({ open }: { open: boolean }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div
          id="mobile-menu"
          key="menu"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          transition={reduce ? { duration: 0 } : SHEET_SPRING}
          className="overflow-hidden md:hidden"
        >
          <ul className="px-4 pt-2 pb-5">
            {NAV.map((item, i) => (
              <m.li
                key={item.slug}
                initial={{ opacity: 0, y: reduce ? 0 : -8, filter: reduce ? 'none' : 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { ...SHEET_SPRING, delay: reduce ? 0 : 0.04 * i } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <Link
                  to="/components/$slug"
                  params={{ slug: item.slug }}
                  className="press flex origin-left items-center py-2.5 font-mono text-2xl font-semibold tracking-tight text-muted transition-colors hover:text-fg"
                  activeProps={{ className: 'text-fg' }}
                >
                  {item.label}
                </Link>
              </m.li>
            ))}
          </ul>
        </m.div>
      )}
    </AnimatePresence>
  )
}

function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button type="button" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} className={iconButtonClass}>
      <span className="swap" aria-hidden="true">
        <span data-off={theme !== 'dark' || undefined} className="[&[data-off]]:rotate-90">
          <SunIcon />
        </span>
        <span data-off={theme === 'dark' || undefined} className="[&[data-off]]:-rotate-90">
          <MoonIcon />
        </span>
      </span>
    </button>
  )
}
