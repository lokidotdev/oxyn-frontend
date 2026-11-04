import { states } from '#/features/states'
import type { Shape } from '#/features/states'
import { Tabs } from '#/shared/ui/tabs'
import type { TabItem } from '#/shared/ui/tabs'
import { ShapeRow } from './shape-row'
import { PlaceholderCard, StateCard } from './state-card'

/** One grid row per silhouette, top to bottom. */
const SHAPE_ROWS: Shape[] = ['globe', 'square', 'circle', 'rings', 'arcs']
const SHAPE_LABELS: Record<Shape, string> = { globe: 'Globe', square: 'Square', circle: 'Circle', rings: 'Rings', arcs: 'Arcs' }
/** One more than fits on a wide screen, so every unfiltered row peeks past the edge. */
const ROW_TILES = 4

export type DimensionFilter = 'all' | '2.5d' | '2d'

const FILTERS: TabItem<DimensionFilter>[] = [
  { value: 'all', label: 'All' },
  { value: '2.5d', label: '2.5D' },
  { value: '2d', label: '2D' },
]

interface HomePageProps {
  filter: DimensionFilter
  onFilterChange: (filter: DimensionFilter) => void
}

export function HomePage({ filter, onFilterChange }: HomePageProps) {
  const visible = filter === 'all' ? states : states.filter((s) => s.dimension.toLowerCase() === filter)
  const rows = SHAPE_ROWS.map((shape) => visible.filter((s) => s.shape === shape)).filter((row) => row.length > 0)

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Loaders for when your interface is thinking.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
          Configurable, dependency-free thinking states for React. Tune every parameter in the playground, then copy the
          file or install it with the shadcn CLI.
        </p>
      </section>

      <div className="mb-8 flex items-center justify-between gap-4">
        <Tabs label="Filter by dimension" items={FILTERS} value={filter} onChange={onFilterChange} />
        <span className="font-mono text-xs text-faint">
          {visible.length} of {states.length}
        </span>
      </div>

      <div className="flex flex-col gap-10">
        {rows.map((row) => {
          // Placeholders only pad the unfiltered view; a filtered view shows what exists.
          const placeholders = filter === 'all' ? Math.max(0, ROW_TILES - row.length) : 0
          return (
            <ShapeRow key={row[0].shape} label={SHAPE_LABELS[row[0].shape]}>
              {row.map((s) => (
                <StateCard key={s.slug} state={s} index={states.indexOf(s)} />
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
