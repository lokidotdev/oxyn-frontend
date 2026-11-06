import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '#/features/catalog/home-page'
import type { DimensionFilter } from '#/features/catalog/home-page'
import { layoutQuery } from '#/features/catalog/layout'
import { seoHead, seoQuery } from '#/features/seo/seo'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { d?: Exclude<DimensionFilter, 'all'> } =>
    search.d === '2d' || search.d === '2.5d' ? { d: search.d } : {},
  loader: async ({ context: { queryClient } }) => {
    const [seo, layout] = await Promise.all([queryClient.ensureQueryData(seoQuery('/')), queryClient.fetchQuery(layoutQuery)])
    return { seo, layout }
  },
  head: ({ loaderData }) =>
    seoHead(loaderData?.seo, {
      title: 'oxyn — loaders for thinking interfaces',
      description: 'Configurable, dependency-free thinking states for React.',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { d } = Route.useSearch()
  const { layout } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  return (
    <HomePage
      layout={layout}
      filter={d ?? 'all'}
      onFilterChange={(next) => navigate({ search: next === 'all' ? {} : { d: next }, replace: true, resetScroll: false })}
    />
  )
}
