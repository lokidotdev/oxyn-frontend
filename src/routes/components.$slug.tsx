import { createFileRoute, notFound } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ComponentPage } from '#/features/playground/component-page'
import { getState } from '#/features/states'
import type { ParamValues } from '#/shared/lib/params'
import { seoHead, seoQuery } from '#/features/seo/seo'
import { componentJsonLd } from '#/features/seo/structured-data'

export const Route = createFileRoute('/components/$slug')({
  validateSearch: (search: Record<string, unknown>) => search,
  loader: async ({ params, context }) => {
    const state = getState(params.slug)
    if (!state) throw notFound()
    const [seo, source] = await Promise.all([context.queryClient.ensureQueryData(seoQuery(`/components/${state.slug}`)), state.loadSource()])
    return { slug: state.slug, seo, source }
  },
  head: ({ loaderData }) => {
    const state = loaderData && getState(loaderData.slug)
    if (!state) return {}
    const description = loaderData.seo?.description ?? state.summary
    return seoHead(loaderData.seo, {
      title: `${state.name} · oxyn`,
      description: state.summary,
      path: `/components/${state.slug}`,
      jsonLd: componentJsonLd(state, description),
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { slug, seo, source } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const state = getState(slug)!

  const persist = useCallback(
    (changed: ParamValues) => navigate({ search: changed, replace: true, resetScroll: false }),
    [navigate],
  )

  return <ComponentPage key={slug} state={state} source={source} search={search} onPersist={persist} heading={seo && { title: seo.h1 ?? state.name, description: seo.description }} />
}
