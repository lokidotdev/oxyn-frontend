import { Link } from '@tanstack/react-router'
import { GitHubIcon } from './icons'

const REPO_URL = 'https://github.com/lokidotdev/oxyn-frontend'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 text-sm font-medium tracking-tight">
          <LogoMark />
          <span>oxyn</span>
        </Link>
        <nav className="flex items-center gap-5 text-[13px] text-muted">
          <Link to="/" className="transition-colors hover:text-fg" activeProps={{ className: 'text-fg' }} activeOptions={{ exact: true }}>
            Components
          </Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository" className="transition-colors hover:text-fg">
            <GitHubIcon />
          </a>
        </nav>
      </div>
    </header>
  )
}

function LogoMark() {
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
