import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { LazyMotion } from 'motion/react'
import { SiteHeader } from '#/shared/ui/site-header'

import appCss from '../styles.css?url'

const loadMotionFeatures = () => import('#/shared/lib/motion-features').then((mod) => mod.default)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
      { title: 'oxyn — loaders for thinking interfaces' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
    // Umami analytics, production builds only.
    scripts: import.meta.env.PROD
      ? [{ defer: true, src: 'https://umami.lok1.dev/script.js', 'data-website-id': '15e5e9d1-a056-4a4b-983f-1d3dd05a1097' }]
      : [],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="mx-auto max-w-7xl px-6 py-24 text-muted">Nothing thinking here.</main>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <LazyMotion features={loadMotionFeatures} strict>
          <SiteHeader />
          {children}
        </LazyMotion>
        <Scripts />
      </body>
    </html>
  )
}
