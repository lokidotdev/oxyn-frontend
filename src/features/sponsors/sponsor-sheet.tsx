import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '#/shared/lib/cn'
import { checkout, planPrice, sponsorFormSchema, track } from './data'
import type { Plan, SponsorFormField, SponsorFormValues } from './data'

// The sponsor form, as a sheet over the page: a bottom sheet on phones, a centred panel elsewhere. It enters and leaves
// along the same path, dims what's behind it (a modal task), and checks each field as you leave it.

const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const

const BLANK: SponsorFormValues = { name: '', email: '', website: '', logoUrl: '', message: '', company: '' }

const FIELDS: { name: Exclude<SponsorFormField, 'company'>; label: string; type?: string; placeholder?: string; optional?: boolean; autoComplete?: string }[] = [
  { name: 'name', label: 'Name or company', placeholder: 'Acme Inc.', autoComplete: 'organization' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'you@acme.dev', autoComplete: 'email' },
  { name: 'website', label: 'Website', type: 'url', placeholder: 'https://acme.dev', optional: true, autoComplete: 'url' },
  { name: 'logoUrl', label: 'Logo URL', type: 'url', placeholder: 'https://acme.dev/logo.svg', optional: true },
]

export function SponsorSheet({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const reduce = useReducedMotion()
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const mq = matchMedia('(min-width: 640px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // While open: Escape closes, the page behind doesn't scroll.
  useEffect(() => {
    if (!plan) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [plan, onClose])

  const hidden = reduce ? { opacity: 0 } : wide ? { opacity: 0, scale: 0.96, y: 12, filter: 'blur(6px)' } : { y: '100%' }
  const shown = reduce ? { opacity: 1 } : wide ? { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' } : { y: 0 }

  return (
    <AnimatePresence>
      {plan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <m.div
            aria-hidden="true"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsor-sheet-title"
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={reduce ? { duration: 0.15 } : SPRING}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface shadow-card sm:max-w-lg sm:rounded-3xl"
          >
            <SponsorForm plan={plan} onClose={onClose} />
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function SponsorForm({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const id = useId()
  const [values, setValues] = useState(BLANK)
  const [errors, setErrors] = useState<Partial<Record<SponsorFormField, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<SponsorFormField, boolean>>>({})
  const [status, setStatus] = useState<{ state: 'idle' | 'sending' } | { state: 'error'; message: string }>({ state: 'idle' })
  const first = useRef<HTMLInputElement>(null)
  useEffect(() => first.current?.focus({ preventScroll: true }), [])

  const fieldError = (next: SponsorFormValues, field: SponsorFormField) =>
    sponsorFormSchema.safeParse(next).error?.issues.find((i) => i.path[0] === field)?.message

  const change = (field: SponsorFormField, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    // Once a field has been left, it re-checks as you type, so a fixed mistake clears at once.
    if (touched[field]) setErrors((e) => ({ ...e, [field]: fieldError(next, field) }))
  }
  const blur = (field: SponsorFormField) => {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors((e) => ({ ...e, [field]: fieldError(values, field) }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = sponsorFormSchema.safeParse(values)
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) next[issue.path[0] as SponsorFormField] ??= issue.message
      setErrors(next)
      setTouched({ name: true, email: true, website: true, logoUrl: true, message: true })
      document.getElementById(`${id}-${Object.keys(next)[0]}`)?.focus()
      return
    }
    setStatus({ state: 'sending' })
    track('sponsor-checkout', plan.billing === 'one_time' ? { billing: 'one_time', amount: plan.amount / 100 } : { billing: plan.billing, tier: plan.tier.id })
    const res = await checkout(plan, parsed.data)
    if (res.ok) window.location.href = res.data.url
    else setStatus({ state: 'error', message: res.error })
  }

  const summary = plan.billing === 'one_time' ? `One-time · ${planPrice(plan)}` : `${plan.tier.name} · ${planPrice(plan)}`
  const logo = values.logoUrl.trim()

  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      {/* A grabber on phones, where this is a bottom sheet. */}
      <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong sm:hidden" />
      <header className="flex items-start justify-between gap-4 px-6 pt-5 sm:pt-6">
        <div>
          <p className="font-mono text-[11px] tracking-wider text-faint uppercase">{summary}</p>
          <h2 id="sponsor-sheet-title" className="mt-1.5 text-xl font-semibold tracking-tight">
            Tell us who you are
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="press -mt-1 -mr-2 grid size-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-fg focus-visible:ring-1 focus-visible:ring-fg/40 focus-visible:outline-none"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="flex flex-col gap-4 px-6 pt-5">
        {FIELDS.map((f, i) => (
          <Field key={f.name} id={`${id}-${f.name}`} label={f.label} optional={f.optional} error={touched[f.name] ? errors[f.name] : undefined}>
            <div className="relative">
              <input
                ref={i === 0 ? first : undefined}
                id={`${id}-${f.name}`}
                name={f.name}
                type={f.type ?? 'text'}
                inputMode={f.type === 'url' ? 'url' : undefined}
                autoComplete={f.autoComplete ?? 'off'}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => change(f.name, e.target.value)}
                onBlur={() => blur(f.name)}
                aria-invalid={Boolean(touched[f.name] && errors[f.name])}
                aria-describedby={touched[f.name] && errors[f.name] ? `${id}-${f.name}-error` : undefined}
                className={cn(inputClass, f.name === 'logoUrl' && logo && 'pr-12')}
              />
              {f.name === 'logoUrl' && logo.startsWith('https://') && (
                <img src={logo} alt="" className="absolute top-1/2 right-2 size-7 -translate-y-1/2 rounded-md bg-raised object-contain p-0.5" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = '')} />
              )}
            </div>
          </Field>
        ))}
        <Field id={`${id}-message`} label="Message" optional error={touched.message ? errors.message : undefined} hint={`${values.message.length}/500`}>
          <textarea
            id={`${id}-message`}
            rows={3}
            placeholder="Anything we should know?"
            value={values.message}
            onChange={(e) => change('message', e.target.value)}
            onBlur={() => blur('message')}
            className={cn(inputClass, 'h-auto resize-none py-2.5 leading-relaxed')}
          />
        </Field>
        {/* Off-screen for people, there for bots. */}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" name="company" value={values.company} onChange={(e) => change('company', e.target.value)} className="absolute -left-[9999px] h-px w-px opacity-0" />
      </div>

      <footer className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t border-line bg-surface/90 px-6 py-4 backdrop-blur-md">
        {status.state === 'error' && (
          <p role="alert" className="font-mono text-xs text-glitch-a">
            {status.message}
          </p>
        )}
        <button
          type="submit"
          disabled={status.state === 'sending'}
          className="press flex h-11 items-center justify-center gap-2 rounded-xl bg-fg text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:opacity-60"
        >
          {status.state === 'sending' && <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
          {status.state === 'sending' ? 'Opening checkout…' : 'Continue to payment'}
        </button>
        <p className="text-center font-mono text-[11px] leading-relaxed text-faint">
          {plan.billing === 'monthly' ? 'Billed monthly until you cancel. ' : plan.billing === 'one_month' ? 'Charged once; your logo stays up for 30 days. ' : 'Charged once. '}
          Payments by Dodo Payments. Your logo goes up once we’ve verified it, usually within a day.
        </p>
      </footer>
    </form>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] text-fg transition-[border-color,box-shadow] duration-150 placeholder:text-faint hover:border-line-strong focus:border-fg/40 focus:ring-4 focus:ring-fg/5 focus:outline-none aria-invalid:border-glitch-a/70'

function Field({ id, label, optional, error, hint, children }: { id: string; label: string; optional?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-[13px] font-medium">
        <span>
          {label}
          {optional && <span className="ml-1.5 font-mono text-[11px] font-normal text-faint">optional</span>}
        </span>
        {hint && <span className="font-mono text-[11px] text-faint tabular-nums">{hint}</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <m.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="font-mono text-[11px] text-glitch-a"
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  )
}
