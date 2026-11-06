import { Link } from '@tanstack/react-router'
import { ANIMATION_KEY, groupedAs } from '#/features/states'
import type { StateDefinition } from '#/features/states'
import { useDotColor } from '#/shared/lib/theme'
import { ArrowUpRightIcon } from '#/shared/ui/icons'

export function StateCard({ state }: { state: StateDefinition }) {
  const { Component } = state
  const color = useDotColor()
  // A grouped animation opens on its row's component, with that animation picked.
  const grouped = groupedAs(state)
  return (
    <Link
      to="/components/$slug"
      params={{ slug: grouped?.group.slug ?? state.slug }}
      search={grouped ? { [ANIMATION_KEY]: grouped.animation } : undefined}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,var(--color-glow),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <Component {...state.cardProps} color={color} />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line p-3">
        <h3 className="min-w-0 truncate text-sm font-medium">{state.name}</h3>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-button shadow-card text-muted transition-[color,box-shadow] group-hover:shadow-card-hover group-hover:text-fg">
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
      <div className="border-t border-dashed border-line p-3">
        <p className="text-sm text-faint">Coming soon</p>
        <p className="font-mono text-xs text-faint/70">In the works</p>
      </div>
    </div>
  )
}
