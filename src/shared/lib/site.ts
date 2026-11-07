/** The deployed origin. Canonical URLs, the sitemap, llms.txt and the MCP server all point here. */
export const SITE_URL = 'https://oxyn.space'

export const SITE_NAME = 'oxyn'

export const SITE_TAGLINE = 'Animated React loaders that say what your AI agent is doing'

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).href

export const installCommand = (slug: string, origin = SITE_URL) => `npx shadcn@latest add ${origin}/r/${slug}.json`
