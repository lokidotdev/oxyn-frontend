import { createFileRoute } from '@tanstack/react-router'
import { AboutPage } from '#/features/about/about-page'
import { seoHead, seoQuery } from '#/features/seo/seo'

export const Route = createFileRoute('/about')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(seoQuery('/about')),
  head: ({ loaderData }) =>
    seoHead(loaderData, {
      title: 'About · oxyn',
      description: 'Why oxyn exists: loaders that say what your AI agent is doing, not just that it is loading.',
      path: '/about',
    }),
  component: AboutPage,
})
