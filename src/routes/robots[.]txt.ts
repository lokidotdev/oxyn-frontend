import { createFileRoute } from '@tanstack/react-router'
import { absoluteUrl } from '#/shared/lib/site'

// Every page is public, and AI crawlers are welcome: being cited by assistants is the point.
const body = `User-agent: *
Allow: /
Disallow: /og-image

Sitemap: ${absoluteUrl('/sitemap.xml')}
`

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
    },
  },
})
