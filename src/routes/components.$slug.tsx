import { createFileRoute, notFound } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ComponentPage } from '#/features/playground/component-page'
import { getState } from '#/features/states'
import type { ParamValues } from '#/shared/lib/params'

export const Route = createFileRoute('/components/$slug')({
  validateSearch: (search: Record<string, unknown>) => search,
  loader: ({ params }) => {
    const state = getState(params.slug)
    if (!state) throw notFound()
    return { slug: state.slug }
  },
  head: ({ params }) => ({ meta: [{ title: `${getState(params.slug)?.name ?? 'Component'} · oxyn` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const state = getState(slug)!

  const persist = useCallback(
    (changed: ParamValues) => navigate({ search: changed, replace: true, resetScroll: false }),
    [navigate],
  )

  return <ComponentPage key={slug} state={state} search={search} onPersist={persist} />
}
