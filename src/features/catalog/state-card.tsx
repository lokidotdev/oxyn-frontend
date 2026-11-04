import { Link } from '@tanstack/react-router'
import type { StateDefinition } from '#/features/states'
import { Badge } from '#/shared/ui/badge'
import { ArrowUpRightIcon } from '#/shared/ui/icons'

export function StateCard({ state, index }: { state: StateDefinition; index: number }) {
  const { Component } = state
  return (
    <Link
      to="/components/$slug"
      params={{ slug: state.slug }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong"
    >
      <div className="stage relative flex aspect-[4/3] items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,#ffffff0a,transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <Component {...state.cardProps} />
        <span className="absolute top-3 left-3 font-mono text-[11px] text-faint">{String(index + 1).padStart(2, '0')}</span>
        <Badge className="absolute top-2.5 right-2.5">{state.dimension}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <h3 className="min-w-0 truncate text-sm font-medium">{state.name}</h3>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line text-muted transition-all group-hover:border-line-strong group-hover:text-fg">
          <ArrowUpRightIcon />
        </span>
      </div>
    </Link>
  )
}

export function PlaceholderCard() {
  return (
    <div aria-hidden="true" className="flex flex-col overflow-hidden rounded-2xl border border-dashed border-line opacity-60">
      <div className="relative flex aspect-[4/3] items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 animate-pulse rounded-full bg-faint" style={{ animationDelay: `${i * 180}ms` }} />
          ))}
        </div>
      </div>
      <div className="border-t border-dashed border-line px-4 py-3">
        <p className="text-sm text-faint">Coming soon</p>
        <p className="font-mono text-xs text-faint/70">In the works</p>
      </div>
    </div>
  )
}
