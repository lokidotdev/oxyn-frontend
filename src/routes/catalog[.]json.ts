import { createFileRoute } from '@tanstack/react-router'
import { catalogRows } from '#/features/catalog/layout'

// The home grid's rows in the registry's order, for the admin panel to arrange. Public, like the site.
export const Route = createFileRoute('/catalog.json')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { rows: catalogRows(null).map((row) => ({ id: row.id, label: row.label, items: row.items.map((s) => ({ slug: s.slug, name: s.name, dimension: s.dimension })) })) },
          { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } },
        ),
    },
  },
})
