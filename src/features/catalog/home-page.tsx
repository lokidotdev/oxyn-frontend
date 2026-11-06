import { states } from '#/features/states'
import { Tabs } from '#/shared/ui/tabs'
import type { TabItem } from '#/shared/ui/tabs'
import { GlitchWord } from './glitch-word'
import { catalogRows } from './layout'
import type { Layout } from './layout'
import { ShapeRow } from './shape-row'
import { PlaceholderCard, StateCard } from './state-card'

/** One more than fits on a wide screen, so every unfiltered row peeks past the edge. */
const ROW_TILES = 4

export type DimensionFilter = 'all' | '2.5d' | '2d'

const FILTERS: TabItem<DimensionFilter>[] = [
  { value: 'all', label: 'All' },
  { value: '2.5d', label: '2.5D' },
  { value: '2d', label: '2D' },
]

interface HomePageProps {
  /** The admin's row and component order; null uses the registry's. */
  layout: Layout | null
  filter: DimensionFilter
  onFilterChange: (filter: DimensionFilter) => void
}

export function HomePage({ layout, filter, onFilterChange }: HomePageProps) {
  const matches = (s: (typeof states)[number]) => filter === 'all' || s.dimension.toLowerCase() === filter
  const rows = catalogRows(layout)
    .map((row) => ({ ...row, items: row.items.filter(matches) }))
    .filter((row) => row.items.length > 0)
  const shown = rows.reduce((n, row) => n + row.items.length, 0)

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Loaders for when your interface{' '}
          {/* Own line, so the cycling word's changing width never re-wraps the lines above. */}
          <span className="block">
            is <GlitchWord suffix="." />
          </span>
        </h1>
        <p className="mt-5 max-w-xl font-mono text-[15px] leading-relaxed text-muted">
          Configurable, dependency-free thinking states for React. Tune every parameter in the playground, then copy the
          file or install it with the shadcn CLI.
        </p>
      </section>

      <div className="mb-8 flex items-center justify-between gap-4">
        <Tabs label="Filter by dimension" items={FILTERS} value={filter} onChange={onFilterChange} />
        <span className="font-mono text-xs text-faint">
          {shown} of {states.length}
        </span>
      </div>

      <div className="flex flex-col gap-10">
        {rows.map((row) => {
          // Placeholders only pad the unfiltered view; a filtered view shows what exists.
          const placeholders = filter === 'all' ? Math.max(0, ROW_TILES - row.items.length) : 0
          return (
            <ShapeRow key={row.id} label={row.label}>
              {row.items.map((s) => (
                <StateCard key={s.slug} state={s} />
              ))}
              {Array.from({ length: placeholders }, (_, i) => (
                <PlaceholderCard key={i} />
              ))}
            </ShapeRow>
          )
        })}
      </div>
    </main>
  )
}

