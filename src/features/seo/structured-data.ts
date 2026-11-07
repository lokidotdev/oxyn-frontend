import { components, groupedAs, useCaseFor } from '#/features/states'
import type { StateDefinition } from '#/features/states'
import { REPO_URL } from '#/shared/ui/site-header'
import { SITE_NAME, SITE_TAGLINE, absoluteUrl } from '#/shared/lib/site'

const WEBSITE_ID = absoluteUrl('/#website')

const website = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE_NAME,
  url: absoluteUrl('/'),
  description: SITE_TAGLINE,
}

/** The homepage: the site, and the library as a list of every component page. */
export function homeJsonLd() {
  return [
    website,
    {
      '@type': 'SoftwareSourceCode',
      name: SITE_NAME,
      description: SITE_TAGLINE,
      url: absoluteUrl('/'),
      codeRepository: REPO_URL,
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'React',
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
    },
    {
      '@type': 'ItemList',
      name: 'oxyn loaders',
      numberOfItems: components.length,
      itemListElement: components.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: absoluteUrl(`/components/${s.slug}`) })),
    },
  ]
}

/** A component page: the component as source code, and its breadcrumb trail. */
export function componentJsonLd(state: StateDefinition, description: string) {
  const url = absoluteUrl(`/components/${state.slug}`)
  const group = groupedAs(state)?.group
  const trail = [{ name: 'Components', url: absoluteUrl('/') }, ...(group ? [{ name: group.name, url: absoluteUrl(`/components/${group.slug}`) }] : []), { name: state.name, url }]
  return [
    {
      '@type': 'SoftwareSourceCode',
      name: state.name,
      description,
      url,
      codeRepository: REPO_URL,
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'React',
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      keywords: `${useCaseFor(state)}, React loader, AI agent loading state, shadcn`,
      isPartOf: { '@id': WEBSITE_ID },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.url })),
    },
  ]
}
