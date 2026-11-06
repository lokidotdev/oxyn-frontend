import { queryOptions } from '@tanstack/react-query'
import { states } from '#/features/states'
import type { Shape, StateDefinition } from '#/features/states'
import { getJson } from '#/shared/lib/api'

/** The registry's own row order, top to bottom: one row per silhouette. */
const SHAPE_ROWS: Shape[] = ['globe', 'square', 'circle', 'rings', 'arcs', 'bars']
const SHAPE_LABELS: Record<Shape, string> = { globe: 'Globe', square: 'Square', circle: 'Circle', rings: 'Rings', arcs: 'Arcs', bars: 'Bars' }

/** The admin's arrangement: row ids (shapes) and slugs, in the order to show them. */
export type Layout = { id: string; items: string[] }[]

export interface CatalogRow {
  id: Shape
  label: string
  items: StateDefinition[]
}

export const layoutQuery = queryOptions({
  queryKey: ['layout'],
  queryFn: () => getJson<{ rows: Layout | null }>('/layout', { rows: null }).then((r) => r.rows),
  // Always refetched on the way to the home page, so an admin reorder shows without waiting out a cache.
  staleTime: 0,
})

/** `items` in the order of `ids`; anything `ids` doesn't name keeps its own order after them. */
function byIds<T>(items: T[], ids: string[] | undefined, id: (item: T) => string): T[] {
  if (!ids) return items
  const rank = new Map(ids.map((v, i) => [v, i]))
  const at = (item: T) => rank.get(id(item)) ?? ids.length + items.indexOf(item)
  return [...items].sort((a, b) => at(a) - at(b))
}

/**
 * The home grid's rows, arranged by the admin's layout where there is one. The registry stays the
 * source of truth: a slug the layout names but the registry lacks is skipped, and a new component
 * the layout doesn't know yet joins the end of its row.
 */
export function catalogRows(layout: Layout | null | undefined): CatalogRow[] {
  const rows = byIds(SHAPE_ROWS, layout?.map((r) => r.id), (s) => s).map((shape) => ({
    id: shape,
    label: SHAPE_LABELS[shape],
    items: byIds(
      states.filter((s) => s.shape === shape),
      layout?.find((r) => r.id === shape)?.items,
      (s) => s.slug,
    ),
  }))
  return rows.filter((row) => row.items.length > 0)
}
