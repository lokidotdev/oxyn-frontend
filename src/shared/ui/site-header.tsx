import { Link, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { groups } from '#/features/states'
import { cn } from '#/shared/lib/cn'
import { setTheme, useTheme } from '#/shared/lib/theme'
import { GitHubIcon, MoonIcon, SunIcon } from './icons'

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
        <Link to="/" className="press flex items-center gap-2.5 text-sm font-medium tracking-tight">
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
          <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository" className={iconButtonClass}>
            <GitHubIcon />
          </a>
          <ThemeToggle />
          <MenuButton open={open} onToggle={() => setOpen((o) => !o)} />
        </div>
      </div>
      <MobileMenu open={open} />
    </header>
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

export function LogoMark() {
  // Static 3×3 dot cluster, smaller dots toward the "back".
  const dots = [
    [4, 4, 1.1], [10, 4, 1.5], [16, 4, 1.1],
    [4, 10, 1.5], [10, 10, 2.2], [16, 10, 1.5],
    [4, 16, 1.1], [10, 16, 1.5], [16, 16, 1.1],
  ]
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="currentColor" opacity={r > 2 ? 1 : r > 1.2 ? 0.7 : 0.4} />
      ))}
    </svg>
  )
}
