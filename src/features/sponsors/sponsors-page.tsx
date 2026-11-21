import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { LayoutGroup, m, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { states } from '#/features/states'
import { cn } from '#/shared/lib/cn'
import { ArrowUpRightIcon, CheckIcon } from '#/shared/ui/icons'
import { LogoMark } from '#/shared/ui/logo-mark'
import { compact, money, requestManageLink, sponsorsQuery, statsQuery, track } from './data'
import type { Plan, PublicSponsor, SponsorsData, Tier } from './data'
import { SponsorSheet } from './sponsor-sheet'

const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const

export function SponsorsPage({ checkout }: { checkout?: number }) {
  const { data } = useSuspenseQuery(sponsorsQuery)
  const [plan, setPlan] = useState<Plan | null>(null)
  const close = useCallback(() => setPlan(null), [])
  const choose = (next: Plan) => {
    if (!data.open) return document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    track('sponsor-open', next.billing === 'one_time' ? { billing: 'one_time' } : { billing: next.billing, tier: next.tier.id })
    setPlan(next)
  }

  return (
    <main className="pb-24">
      <Hero thanks={checkout !== undefined} />
      <div className="mx-auto flex max-w-5xl flex-col gap-24 px-4 sm:px-6">
        <Stats />
        <Wall data={data} onChoose={choose} />
        <Plans data={data} onChoose={choose} />
        {data.platform.length > 0 && <Platform data={data} />}
        <Contact email={data.contactEmail} />
      </div>
      <SponsorSheet plan={plan} onClose={close} />
    </main>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ thanks }: { thanks: boolean }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      {/* The mark, blown up and dimmed: the dots read as texture behind the title. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 flex justify-center text-fg opacity-[0.07] [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      >
        <LogoMark size={680} />
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-24 pb-20 text-center sm:px-6 sm:pt-32 sm:pb-28">
        <span className="font-mono text-xs tracking-wider text-faint uppercase">Sponsors</span>
        <h1 className="mt-4 text-5xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-7xl">Keep oxyn thinking.</h1>
        <p className="mt-5 max-w-xl font-mono text-[15px] leading-relaxed text-pretty text-muted">
          Your support keeps oxyn free and open source for every developer building agent interfaces.
        </p>
        {thanks ? (
          <p
            role="status"
            className="mt-8 flex items-center gap-2 rounded-full bg-raised px-4 py-2 font-mono text-[13px] text-fg shadow-card"
          >
            <CheckIcon /> Thank you. We’ll verify your payment and put your logo up shortly.
          </p>
        ) : (
          <a
            href="#plans"
            className="press mt-8 inline-flex h-11 items-center rounded-xl bg-fg px-5 font-mono text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
          >
            Become a sponsor
          </a>
        )}
      </div>
    </section>
  )
}

// ── Stats ────────────────────────────────────────────────────────────────────

/** Counts up to `to` once it's known, easing out; jumps straight there under reduced motion. */
function useCountUp(to: number | null, ms = 900) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (to === null) return
    if (reduce) return setValue(to)
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      setValue(Math.round(to * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    // rAF pauses in background tabs; land on the real number regardless
    const settle = setTimeout(() => setValue(to), ms + 100)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(settle)
    }
  }, [to, ms, reduce])
  return value
}

function Stat({
  value,
  suffix = '+',
  label,
  className,
}: {
  value: number | null | string
  suffix?: string
  label: string
  className?: string
}) {
  const n = useCountUp(typeof value === 'number' ? value : null)
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl bg-surface px-4 py-8 text-center shadow-card', className)}>
      <span className="text-4xl font-semibold tracking-[-0.03em] tabular-nums sm:text-5xl">
        {typeof value === 'string' ? value : value === null ? '—' : `${compact(n)}${suffix}`}
      </span>
      <span className="mt-2 font-mono text-[13px] text-muted">{label}</span>
    </div>
  )
}

function Stats() {
  const stats = useQuery(statsQuery).data
  return (
    <section aria-label="Reach" className="flex flex-col gap-3 pt-16">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={stats?.pageviewsMonth ?? null} label="Pageviews, last 30 days" />
        <Stat value={stats?.stars ?? null} label="GitHub stars" />
        <Stat value={states.length} label="Loaders" />
        <Stat value="Free" label="For anything you build" />
      </div>
      <Stat value={stats?.pageviewsTotal ?? null} label="Pageviews since launch" className="py-10" />
      <p className="text-center font-mono text-[11px] text-faint">Live from our Umami analytics. Updated hourly.</p>
    </section>
  )
}

// ── Sponsor wall ─────────────────────────────────────────────────────────────

// The first tier gets the biggest tiles; each one after steps down.
const WALL = [
  { grid: 'sm:grid-cols-2', tile: 'h-36 sm:h-44', logo: 'max-h-14 max-w-[70%]', name: 'text-3xl' },
  { grid: 'grid-cols-2 sm:grid-cols-3', tile: 'h-28', logo: 'max-h-10 max-w-[70%]', name: 'text-xl' },
  { grid: 'grid-cols-2 sm:grid-cols-4', tile: 'h-20', logo: 'max-h-7 max-w-[70%]', name: 'text-base' },
]

function Wall({ data, onChoose }: { data: SponsorsData; onChoose: (p: Plan) => void }) {
  if (!data.tiers.length && !data.backers.length) return null
  return (
    <section aria-labelledby="wall-title" className="flex flex-col gap-12">
      <h2 id="wall-title" className="sr-only">
        Our sponsors
      </h2>
      {data.tiers.map((tier, i) => {
        const size = WALL[Math.min(i, WALL.length - 1)]!
        return (
          <div key={tier.id} className="flex flex-col items-center gap-4">
            <h3 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">{tier.name}</h3>
            <ul className={cn('grid w-full gap-3', size.grid)}>
              {tier.sponsors.map((s) => (
                <li key={s.id}>
                  <SponsorTile sponsor={s} className={size.tile} logo={size.logo} name={size.name} />
                </li>
              ))}
              {tier.spotsLeft !== 0 && (
                <li className={cn(tier.sponsors.length === 0 && 'col-span-full mx-auto w-full max-w-md')}>
                  <button
                    type="button"
                    onClick={() => onChoose({ billing: 'monthly', tier })}
                    className={cn(
                      'press group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong font-mono text-[13px] text-faint transition-colors hover:border-fg/30 hover:text-fg focus-visible:ring-1 focus-visible:ring-fg/40 focus-visible:outline-none',
                      size.tile,
                    )}
                  >
                    <span aria-hidden="true" className="text-base transition-transform duration-200 group-hover:rotate-90">
                      +
                    </span>
                    {tier.sponsors.length ? 'Your logo here' : `Be the first ${tier.name} sponsor`}
                  </button>
                </li>
              )}
            </ul>
          </div>
        )
      })}
      {data.backers.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <h3 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">Backers</h3>
          <ul className="flex flex-wrap justify-center gap-2">
            {data.backers.map((s) => (
              <li key={s.id}>
                <a
                  href={s.website ?? undefined}
                  target="_blank"
                  rel="noreferrer sponsored"
                  className="press flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] shadow-card transition-shadow hover:shadow-card-hover"
                >
                  {s.logoUrl && <img src={s.logoUrl} alt="" className="size-4 rounded object-contain" />}
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function SponsorTile({ sponsor, className, logo, name }: { sponsor: PublicSponsor; className: string; logo: string; name: string }) {
  const body = sponsor.logoUrl ? (
    <img src={sponsor.logoUrl} alt={sponsor.name} className={cn('object-contain', logo)} />
  ) : (
    <span className={cn('font-semibold tracking-tight', name)}>{sponsor.name}</span>
  )
  const cls = cn('flex w-full items-center justify-center rounded-2xl bg-surface shadow-card transition-shadow', className)
  return sponsor.website ? (
    <a
      href={sponsor.website}
      target="_blank"
      rel="noreferrer sponsored"
      title={sponsor.name}
      className={cn(cls, 'press hover:shadow-card-hover')}
    >
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  )
}

// ── Plans ────────────────────────────────────────────────────────────────────

type Billing = 'monthly' | 'one_month' | 'one_time'

function Plans({ data, onChoose }: { data: SponsorsData; onChoose: (p: Plan) => void }) {
  const [billing, setBilling] = useState<Billing>('monthly')
  const options: { id: Billing; label: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    ...(data.oneMonth?.enabled ? [{ id: 'one_month' as const, label: '1 month' }] : []),
    ...(data.oneTime.enabled ? [{ id: 'one_time' as const, label: 'One-time' }] : []),
  ]
  return (
    <section id="plans" aria-labelledby="plans-title" className="scroll-mt-24">
      <div className="flex flex-col items-center text-center">
        <h2 id="plans-title" className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
          Power a growing open-source library
        </h2>
        <p className="mt-3 max-w-md font-mono text-sm leading-relaxed text-muted">
          Pick a tier and put your logo in front of the developers building with oxyn. Cancel anytime.
        </p>
        {options.length > 1 && <Segmented value={billing} options={options} onChange={setBilling} />}
      </div>

      <div className="mt-10">
        {billing !== 'one_time' ? (
          <ul className={cn('grid gap-3', data.tiers.length >= 3 ? 'lg:grid-cols-3' : data.tiers.length === 2 && 'sm:grid-cols-2')}>
            {data.tiers.map((t) => (
              <li key={t.id}>
                <TierCard tier={t} billing={billing} open={data.open} onChoose={() => onChoose({ billing, tier: t })} />
              </li>
            ))}
          </ul>
        ) : (
          <OneTime data={data} onChoose={onChoose} />
        )}
      </div>

      <p className="mt-6 text-center font-mono text-xs leading-relaxed text-faint">
        {data.open
          ? billing === 'one_month'
            ? 'Billed in USD, once. Your logo stays up for 30 days, with nothing to cancel. Payments by Dodo Payments, our merchant of record.'
            : 'Billed in USD. Monthly plans renew until you cancel. Payments by Dodo Payments, our merchant of record.'
          : 'Sponsorships open soon. Email us below in the meantime.'}
      </p>
      {data.open && <ManageLink />}
    </section>
  )
}

/** Two options and a pill that slides between them, so the choice reads as one control, not two buttons. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  const reduce = useReducedMotion()
  return (
    <LayoutGroup id="billing">
      <div role="radiogroup" aria-label="Billing" className="mt-8 inline-flex rounded-full bg-surface p-1 shadow-card">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className="relative h-9 rounded-full px-5 font-mono text-[13px] text-muted transition-colors aria-checked:text-bg focus-visible:ring-1 focus-visible:ring-fg/40 focus-visible:outline-none"
          >
            {value === o.id && (
              <m.span
                layoutId="billing-pill"
                transition={reduce ? { duration: 0 } : SPRING}
                className="absolute inset-0 rounded-full bg-fg"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  )
}

function TierCard({ tier, billing, open, onChoose }: { tier: Tier; billing: 'monthly' | 'one_month'; open: boolean; onChoose: () => void }) {
  const soldOut = tier.spotsLeft === 0
  return (
    <article className={cn('relative flex h-full flex-col rounded-3xl bg-surface p-6 shadow-card', tier.highlight && 'ring-1 ring-fg/25')}>
      {tier.highlight && (
        <span className="absolute -top-2.5 left-6 rounded-full bg-fg px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-bg uppercase">
          Most impact
        </span>
      )}
      <h3 className="text-[15px] font-semibold">{tier.name}</h3>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-[-0.03em] tabular-nums">{money(tier.monthlyPrice)}</span>
        <span className="font-mono text-[13px] text-muted">{billing === 'monthly' ? '/month' : 'for 1 month'}</span>
      </p>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-line pt-5">
        {tier.perks.map((p) => (
          <li key={p} className="flex items-start gap-2.5 font-mono text-[13px] leading-snug text-muted">
            <span className="mt-px shrink-0 text-fg">
              <CheckIcon />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onChoose}
        disabled={!open || soldOut}
        className={cn(
          'press mt-6 h-11 cursor-pointer rounded-xl font-mono text-sm font-medium transition-opacity focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
          tier.highlight ? 'bg-fg text-bg hover:opacity-90' : 'bg-raised text-fg shadow-card hover:shadow-card-hover',
        )}
      >
        {soldOut ? 'Sold out' : billing === 'monthly' ? `Sponsor as ${tier.name}` : `${tier.name} for 1 month`}
      </button>
    </article>
  )
}

function OneTime({ data, onChoose }: { data: SponsorsData; onChoose: (p: Plan) => void }) {
  const { min, suggested } = data.oneTime
  const [picked, setPicked] = useState<number | 'custom'>(suggested[0] ?? 'custom')
  const [custom, setCustom] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const cents = picked === 'custom' ? Math.round(Number(custom) * 100) : picked
  const valid = Number.isFinite(cents) && cents >= min
  const error = picked === 'custom' && custom !== '' && !valid ? `At least ${money(min)}` : null

  return (
    <div className="mx-auto flex max-w-lg flex-col rounded-3xl bg-surface p-6 shadow-card">
      <h3 className="text-[15px] font-semibold">Give once</h3>
      <p className="mt-1 font-mono text-[13px] text-muted">Any amount from {money(min)}. Your name joins the backers above.</p>
      <div role="radiogroup" aria-label="Amount" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {suggested.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={picked === a}
            onClick={() => setPicked(a)}
            className="press h-11 rounded-xl bg-raised font-mono text-sm tabular-nums shadow-card transition-colors aria-checked:bg-fg aria-checked:text-bg focus-visible:ring-1 focus-visible:ring-fg/40 focus-visible:outline-none"
          >
            {money(a)}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={picked === 'custom'}
          onClick={() => {
            setPicked('custom')
            requestAnimationFrame(() => input.current?.focus())
          }}
          className="press h-11 rounded-xl bg-raised font-mono text-sm shadow-card transition-colors aria-checked:bg-fg aria-checked:text-bg focus-visible:ring-1 focus-visible:ring-fg/40 focus-visible:outline-none"
        >
          Other
        </button>
      </div>
      {picked === 'custom' && (
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="sr-only">Amount in US dollars</span>
          <span className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted">$</span>
            <input
              ref={input}
              inputMode="decimal"
              placeholder={String(min / 100)}
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ''))}
              aria-invalid={Boolean(error)}
              className="h-11 w-full rounded-xl border border-line bg-bg pr-3.5 pl-7 font-mono text-[15px] tabular-nums focus:border-fg/40 focus:ring-4 focus:ring-fg/5 focus:outline-none aria-invalid:border-glitch-a/70"
            />
          </span>
          {error && <span className="font-mono text-[11px] text-glitch-a">{error}</span>}
        </label>
      )}
      <button
        type="button"
        disabled={!valid || !data.open}
        onClick={() => onChoose({ billing: 'one_time', amount: cents })}
        className="press mt-5 h-11 rounded-xl bg-fg text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {valid ? `Sponsor ${money(cents)} once` : 'Choose an amount'}
      </button>
    </div>
  )
}

// ── Platform & contact ───────────────────────────────────────────────────────

function Platform({ data }: { data: SponsorsData }) {
  return (
    <section aria-labelledby="platform-title" className="flex flex-col items-center gap-2 text-center">
      <h2 id="platform-title" className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
        Platform sponsors
      </h2>
      <p className="font-mono text-[13px] text-faint">Products that back oxyn through their open-source programs.</p>
      <ul className="mt-4 grid w-full gap-3 sm:grid-cols-2">
        {data.platform.map((p) => (
          <li key={p.name}>
            <a
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="press flex h-32 flex-col items-center justify-center gap-3 rounded-2xl bg-surface shadow-card transition-shadow hover:shadow-card-hover"
            >
              <img src={p.logoUrl} alt={p.name} className="max-h-9 max-w-[60%] object-contain" />
              {p.label && <span className="font-mono text-[10px] tracking-[0.15em] text-faint uppercase">{p.label}</span>}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Contact({ email }: { email: string | null }) {
  if (!email) return null
  return (
    <section className="flex flex-col items-center text-center">
      <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Questions, or need a custom package?</h2>
      <p className="mt-3 max-w-sm font-mono text-sm text-muted">
        Happy to put something together that fits how your team wants to show up.
      </p>
      <a
        href={`mailto:${email}?subject=${encodeURIComponent('Sponsoring oxyn')}`}
        className="press mt-6 inline-flex h-10 items-center gap-1.5 rounded-xl bg-raised px-4 text-sm shadow-card transition-shadow hover:shadow-card-hover"
      >
        {email}
        <ArrowUpRightIcon />
      </a>
    </section>
  )
}

// ── Manage or cancel ─────────────────────────────────────────────────────────

/**
 * For monthly sponsors: Dodo emails them a link to its customer portal, where they update the card or cancel. Opens in
 * place from a quiet link, and says the same thing whatever the email, so it can't reveal who sponsors.
 */
function ManageLink() {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string }>({ kind: 'idle' })
  const input = useRef<HTMLInputElement>(null)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setState({ kind: 'sending' })
    track('sponsor-manage')
    const res = await requestManageLink(email.trim())
    setState(res.ok ? { kind: 'sent' } : { kind: 'error', message: res.error })
  }

  return (
    <div className="mt-4 flex flex-col items-center">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            requestAnimationFrame(() => input.current?.focus())
          }}
          className="group font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          <span className="link-underline">Already sponsoring? Manage or cancel</span>
        </button>
      ) : (
        <m.div
          initial={{ opacity: 0, y: reduce ? 0 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="w-full max-w-md rounded-2xl bg-surface p-4 shadow-card"
        >
          {state.kind === 'sent' ? (
            <p role="status" className="font-mono text-[13px] leading-relaxed text-muted">
              If that email has a monthly sponsorship, Dodo Payments has sent it a link to manage or cancel. Check your inbox.
            </p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" noValidate>
              <label className="sr-only" htmlFor="manage-email">
                The email you sponsored with
              </label>
              <input
                ref={input}
                id="manage-email"
                type="email"
                autoComplete="email"
                placeholder="The email you sponsored with"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm placeholder:text-faint focus:border-fg/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!valid || state.kind === 'sending'}
                className="press h-10 shrink-0 rounded-xl bg-fg px-4 font-mono text-[12px] text-bg transition-opacity disabled:opacity-40"
              >
                {state.kind === 'sending' ? 'Sending…' : 'Email me a link'}
              </button>
            </form>
          )}
          {state.kind === 'error' && <p className="mt-2 font-mono text-[11px] text-glitch-a">{state.message}</p>}
        </m.div>
      )}
    </div>
  )
}
