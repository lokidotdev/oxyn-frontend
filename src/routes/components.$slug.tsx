import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ComponentPage } from '#/features/playground/component-page'
import { ANIMATION_KEY, getState, groupedAs } from '#/features/states'
import type { ParamValues } from '#/shared/lib/params'

export const Route = createFileRoute('/components/$slug')({
  validateSearch: (search: Record<string, unknown>) => search,
  loader: ({ params, location }) => {
    const state = getState(params.slug)
    if (!state) throw notFound()
    // A grouped animation opens on its row's component, so switching animation never leaves the page.
    const grouped = groupedAs(state)
    if (grouped) {
      throw redirect({
        to: '/components/$slug',
        params: { slug: grouped.group.slug },
        search: { ...(location.search as Record<string, unknown>), [ANIMATION_KEY]: grouped.animation },
        replace: true,
      })
    }
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
