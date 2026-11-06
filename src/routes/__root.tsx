import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { LazyMotion } from 'motion/react'
import { SiteHeader } from '#/shared/ui/site-header'
import { SiteFooter } from '#/shared/ui/site-footer'
import { AnnouncementBar, bannerQuery } from '#/features/announcements/announcement-bar'

import { THEME_INIT_SCRIPT } from '#/shared/lib/theme'
import appCss from '../styles.css?url'

const loadMotionFeatures = () => import('#/shared/lib/motion-features').then((mod) => mod.default)

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => context.queryClient.ensureQueryData(bannerQuery),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark light' },
      { title: 'oxyn — loaders for thinking interfaces' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
    // Umami analytics, production builds only, and only when both env values are set.
    scripts:
      import.meta.env.PROD && import.meta.env.VITE_UMAMI_SCRIPT_URL && import.meta.env.VITE_UMAMI_WEBSITE_ID
        ? [{ defer: true, src: import.meta.env.VITE_UMAMI_SCRIPT_URL, 'data-website-id': import.meta.env.VITE_UMAMI_WEBSITE_ID }]
        : [],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="mx-auto max-w-7xl px-6 py-24 text-muted">Nothing thinking here.</main>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <LazyMotion features={loadMotionFeatures} strict>
          <AnnouncementBar />
          <SiteHeader />
          {children}
          <SiteFooter />
        </LazyMotion>
        <Scripts />
      </body>
    </html>
  )
}
