import { Link } from '@tanstack/react-router'
import { groupedAs, states } from '#/features/states'
import { ArrowUpRightIcon, GitHubIcon } from './icons'
import { LogoMark } from './logo-mark'
import { REPO_URL } from './site-header'

const AUTHOR_URL = 'https://x.com/lokidotdev'

// Padding widens the hit area; the negative margin cancels it so text stays aligned with its column.
const linkClass = 'group -m-1.5 inline-flex p-1.5 font-sans text-muted transition-colors hover:text-fg'
const textClass = 'link-underline inline-flex items-center gap-1.5 leading-none'

/** One entry per page: grouped animations collapse into their group's component. */
const components = [
  ...new Map(
    states.map((s) => {
      const grouped = groupedAs(s)
      const page = grouped?.group ?? s
      return [page.slug, { slug: page.slug, name: page.name }] as const
    }),
  ).values(),
]

export function SiteFooter() {
  return (
    <footer className="relative mt-8">
      {/* Edge fade instead of a hard divider: the page dissolves into the footer. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-[1fr_auto_auto] sm:items-start sm:gap-16 sm:px-6">
        <div className="flex flex-col gap-3">
          <Link to="/" className="flex w-fit items-center gap-2.5 text-sm font-medium tracking-tight">
            <LogoMark />
            <span>oxyn</span>
          </Link>
          <p className="max-w-xs font-mono text-[13px] leading-relaxed text-faint">
            Loaders for when your interface is thinking.
          </p>
        </div>

        <FooterGroup title="Library">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3">
            {components.map((c) => (
              <li key={c.slug}>
                <Link to="/components/$slug" params={{ slug: c.slug }} className={linkClass}>
                  <span className={textClass}>{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </FooterGroup>

        <FooterGroup title="Elsewhere">
          <ul className="flex flex-col gap-3">
            <li>
              <Link to="/about" className={linkClass}>
                <span className={textClass}>About</span>
              </Link>
            </li>
            <li>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className={linkClass}>
                <span className={textClass}>
                  <GitHubIcon size={12} />
                  GitHub
                  <ArrowUpRightIcon />
                </span>
              </a>
            </li>
          </ul>
        </FooterGroup>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pb-10 font-mono text-xs text-faint sm:px-6">
        <span>© {new Date().getFullYear()} oxyn</span>
        <span>
          Built by{' '}
          <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="group -m-1.5 inline-flex p-1.5 text-fg">
            <span className="link-underline">lokidotdev</span>
          </a>
        </span>
      </div>
    </footer>
  )
}

function FooterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <span className="font-mono text-xs tracking-wide text-faint">{title}</span>
      {children}
    </div>
  )
}
