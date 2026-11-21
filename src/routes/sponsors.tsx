import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { sponsorsQuery } from '#/features/sponsors/data'
import { SponsorsPage } from '#/features/sponsors/sponsors-page'
import { seoHead, seoQuery } from '#/features/seo/seo'

// Dodo sends buyers back to /sponsors?checkout=<sponsor id> (plus its own payment_id and status params).
const search = z.object({ checkout: z.coerce.number().int().positive().optional().catch(undefined) })

export const Route = createFileRoute('/sponsors')({
  validateSearch: (raw) => search.parse(raw),
  loader: async ({ context: { queryClient } }) => {
    const [seo] = await Promise.all([queryClient.ensureQueryData(seoQuery('/sponsors')), queryClient.ensureQueryData(sponsorsQuery)])
    return seo
  },
  head: ({ loaderData }) =>
    seoHead(loaderData, {
      title: 'Sponsors · oxyn',
      description: 'Sponsor oxyn and put your logo in front of the developers building agent interfaces. Monthly tiers or a one-time gift.',
      path: '/sponsors',
    }),
  component: function Sponsors() {
    const { checkout } = Route.useSearch()
    return <SponsorsPage checkout={checkout} />
  },
})
