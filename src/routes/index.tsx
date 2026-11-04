import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '#/features/catalog/home-page'
import type { DimensionFilter } from '#/features/catalog/home-page'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { d?: Exclude<DimensionFilter, 'all'> } =>
    search.d === '2d' || search.d === '2.5d' ? { d: search.d } : {},
  component: RouteComponent,
})

function RouteComponent() {
  const { d } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <HomePage
      filter={d ?? 'all'}
      onFilterChange={(next) => navigate({ search: next === 'all' ? {} : { d: next }, replace: true, resetScroll: false })}
    />
  )
}
