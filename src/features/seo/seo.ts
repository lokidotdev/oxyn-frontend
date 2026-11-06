import { queryOptions } from '@tanstack/react-query'
import { getJson } from '#/shared/lib/api'

interface SeoEntry {
  title: string
  description: string
  ogImage: string | null
  h1: string | null
  ogTitle: string | null
  ogDescription: string | null
  keywords: string | null
}

/** The admin override for one page, or null when the page uses its defaults. */
export const seoQuery = (path: string) =>
  queryOptions({
    queryKey: ['seo', path],
    queryFn: () => getJson<SeoEntry | null>(`/seo/page?path=${encodeURIComponent(path)}`, null),
  })

/** Head tags for a page: the override where one exists, the page's own defaults otherwise. */
export function seoHead(override: SeoEntry | null | undefined, defaults: { title: string; description: string }) {
  const title = override?.title ?? defaults.title
  const description = override?.description ?? defaults.description
  const image = override?.ogImage
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      ...(override?.keywords ? [{ name: 'keywords', content: override.keywords }] : []),
      { property: 'og:title', content: override?.ogTitle ?? title },
      { property: 'og:description', content: override?.ogDescription ?? description },
      { name: 'twitter:title', content: override?.ogTitle ?? title },
      { name: 'twitter:description', content: override?.ogDescription ?? description },
      ...(image ? [{ property: 'og:image', content: image }, { name: 'twitter:image', content: image }] : []),
    ],
  }
}
