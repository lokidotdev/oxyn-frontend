import { createFileRoute } from '@tanstack/react-router'
import { components } from '#/features/states'
import { absoluteUrl } from '#/shared/lib/site'

// The homepage, the about page, then one page per component: every single loader and every group.
const urls = [
  { loc: absoluteUrl('/'), priority: '1.0' },
  { loc: absoluteUrl('/about'), priority: '0.5' },
  ...components.map((s) => ({ loc: absoluteUrl(`/components/${s.slug}`), priority: s.animations ? '0.9' : '0.8' })),
]

const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
    },
  },
})
