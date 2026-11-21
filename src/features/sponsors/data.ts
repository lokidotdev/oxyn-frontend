import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson, postJson } from '#/shared/lib/api'

export interface PublicSponsor {
  id: number
  name: string
  website: string | null
  logoUrl: string | null
}

export interface Tier {
  id: string
  name: string
  /** Cents. */
  monthlyPrice: number
  perks: string[]
  highlight: boolean
  /** null = unlimited. */
  maxSponsors: number | null
  /** null = unlimited; 0 = sold out. */
  spotsLeft: number | null
  sponsors: PublicSponsor[]
}

export interface SponsorsData {
  tiers: Tier[]
  backers: PublicSponsor[]
  oneTime: { enabled: boolean; min: number; suggested: number[] }
  /** A tier slot for one month, paid once at the tier's monthly price. */
  oneMonth: { enabled: boolean }
  platform: { name: string; logoUrl: string; href: string; label: string }[]
  contactEmail: string | null
  currency: string
  /** False until the backend has its Dodo keys; the page then shows the plans but not the form. */
  open: boolean
}

export interface SponsorStats {
  pageviewsMonth: number | null
  pageviewsTotal: number | null
  stars: number | null
  updatedAt: string | null
}

const EMPTY: SponsorsData = {
  tiers: [],
  backers: [],
  oneTime: { enabled: false, min: 0, suggested: [] },
  oneMonth: { enabled: false },
  platform: [],
  contactEmail: null,
  currency: 'USD',
  open: false,
}

export const sponsorsQuery = queryOptions({
  queryKey: ['sponsors'],
  queryFn: () => getJson<SponsorsData>('/sponsors', EMPTY).then(withDevDemo),
})

/** Every sponsor shown by name: tier sponsors top tier first, then platform sponsors. */
export const hasSponsors = (data: SponsorsData) => data.tiers.some((t) => t.sponsors.length > 0) || data.platform.length > 0

// ── Demo sponsors, `vite dev` only ──────────────────────────────────────────────────────────────────────────────────
// With no real sponsors, local dev fills the first two tiers and the platform row so the sponsor UI can be seen. Never in
// a build: `import.meta.env.DEV` is false there and this is dropped. Turn it off in dev with VITE_SPONSOR_DEMO=0.

const DEMO_ON = import.meta.env.DEV && import.meta.env.VITE_SPONSOR_DEMO !== '0'

function withDevDemo(data: SponsorsData): SponsorsData {
  if (!DEMO_ON || hasSponsors(data) || data.tiers.length === 0) return data
  const demo = (id: number, name: string): PublicSponsor => ({ id: -id, name, website: 'https://example.com', logoUrl: null })
  return {
    ...data,
    tiers: data.tiers.map((t, i) =>
      i === 0
        ? { ...t, sponsors: [demo(1, 'Demo Sponsor Co.')] }
        : i === 1
          ? { ...t, sponsors: [demo(2, 'Example Labs'), demo(3, 'Acme Studio')] }
          : t,
    ),
    platform: [
      { name: 'Demo Platform', logoUrl: 'https://oxyn.space/favicon.svg', href: 'https://example.com', label: 'Hosting sponsor (demo)' },
    ],
  }
}

export const statsQuery = queryOptions({
  queryKey: ['sponsor-stats'],
  queryFn: () => getJson<SponsorStats>('/sponsors/stats', { pageviewsMonth: null, pageviewsTotal: null, stars: null, updatedAt: null }),
  staleTime: 5 * 60_000,
})

// ── The form ─────────────────────────────────────────────────────────────────
// The same rules the API checks, so mistakes show beside the field instead of after a round trip.

const optionalHttps = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(v), 'Use a full https:// link')
  .transform((v) => v || undefined)

export const sponsorFormSchema = z.object({
  name: z.string().trim().min(1, 'Who should we thank?').max(80, 'Keep it under 80 characters'),
  email: z.email('Enter an email we can reach you at').max(254),
  website: optionalHttps,
  logoUrl: optionalHttps,
  message: z
    .string()
    .trim()
    .max(500, 'Keep it under 500 characters')
    .transform((v) => v || undefined),
  company: z.string().max(200), // honeypot
})
export type SponsorFormValues = z.input<typeof sponsorFormSchema>
export type SponsorFormField = keyof SponsorFormValues

export type Plan = { billing: 'monthly' | 'one_month'; tier: Tier } | { billing: 'one_time'; amount: number }

export function checkout(plan: Plan, form: z.output<typeof sponsorFormSchema>) {
  const body =
    plan.billing === 'one_time'
      ? { ...form, billing: 'one_time', amount: plan.amount }
      : { ...form, billing: plan.billing, tierId: plan.tier.id }
  return postJson<{ id: number; url: string }>('/sponsors/checkout', body)
}

/** $1,500 or $12.50 */
export const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0 })}`

/** 223,412 → "223K", 1,104,000 → "1.1M". */
export const compact = (n: number) =>
  n < 1000
    ? String(n)
    : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: n < 10_000 || (n >= 1e6 && n < 1e7) ? 1 : 0 }).format(n)

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | number>) => void }
  }
}

/** A custom event in Umami, when its script has loaded (production only). */
export const track = (event: string, data?: Record<string, string | number>) => {
  try {
    window.umami?.track(event, data)
  } catch {}
}

/** Asks Dodo to email the sponsor a link to manage or cancel. The answer never says whether the email sponsors anything. */
export const requestManageLink = (email: string) => postJson<{ ok: true }>('/sponsors/manage', { email })

/** "$250/month", "$250 for 1 month", "$40 once": what a plan costs, in words. */
export function planPrice(plan: Plan) {
  if (plan.billing === 'one_time') return `${money(plan.amount)} once`
  return plan.billing === 'monthly' ? `${money(plan.tier.monthlyPrice)}/month` : `${money(plan.tier.monthlyPrice)} for 1 month`
}
