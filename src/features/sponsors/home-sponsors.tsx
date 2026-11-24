import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from '#/shared/lib/cn'
import { AvatarGroup } from '#/shared/ui/avatar-group'
import type { AvatarGroupMember } from '#/shared/ui/avatar-group'
import { hasSponsors, sponsorsQuery } from './data'
import type { SponsorsData } from './data'

// The homepage's sponsor pieces: a "Backed by" badge in the hero and a closing section. Both show sponsors only once
// there are some; until then each is just a "Become a sponsor" button.

/** "Become a sponsor →", the one thing both pieces show while there are no sponsors. */
function BecomeSponsor({ className }: { className?: string }) {
  return (
    <Link
      to="/sponsors"
      className={cn(
        'press group inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-4 font-mono text-[12px] text-muted shadow-card transition-colors hover:text-fg',
        className,
      )}
    >
      Become a sponsor
      <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  )
}

/** Everyone the badge shows: tier sponsors top tier first, then platform sponsors. */
const badgeMembers = (data: SponsorsData): AvatarGroupMember[] => [
  ...data.tiers.flatMap((t) =>
    t.sponsors.map((s) => ({ id: `s${s.id}`, name: s.name, src: s.logoUrl ?? undefined, href: s.website ?? undefined })),
  ),
  ...data.platform.map((p) => ({ id: `p${p.name}`, name: p.name, src: p.logoUrl, href: p.href })),
]

export function BackedBy({ className }: { className?: string }) {
  const data = useQuery(sponsorsQuery).data
  if (!data) return null
  if (!hasSponsors(data)) return <BecomeSponsor className={className} />

  return (
    <div className={cn('inline-flex h-10 items-center gap-3 rounded-full bg-surface pr-1.5 pl-4 shadow-card', className)}>
      <Link to="/sponsors" className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase transition-colors hover:text-fg">
        Backed by
      </Link>
      <span aria-hidden="true" className="h-4 w-px bg-line-strong" />
      {/* light discs read against the dark pill; the ring matches the pill so overlaps stay clean */}
      <AvatarGroup members={badgeMembers(data)} max={5} size="sm" fit="contain" tone="bg-fg text-bg" ring="ring-surface" label="Sponsors" />
    </div>
  )
}

// ── The homepage's closing section ──────────────────────────────────────────────────────────────────────────────────
// The top two tiers (Diamond and Gold by default, whose perks promise a homepage logo), then the platform sponsors.
// A group shows once it has a sponsor, and ends in a "Your logo here" tile while it has room.

const HOME_TIERS = 2
// Rows are centred, so a part-filled row sits in the middle like a full one. Widths: halves for the top tier, quarters
// (halves on phones) for the next, thirds for platform sponsors; 0.75rem is the gap.
const TOP = 'w-full sm:w-[calc((100%-0.75rem)/2)]'
const REST = 'w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2.25rem)/4)]'
const THIRD = 'w-full sm:w-[calc((100%-1.5rem)/3)]'

export function HomeSponsors() {
  const data = useQuery(sponsorsQuery).data
  if (!data) return null
  // only groups that have someone in them; with nobody at all, just the button
  const tiers = data.tiers.slice(0, HOME_TIERS).filter((t) => t.sponsors.length > 0)
  if (!tiers.length && !data.platform.length) {
    return (
      <section aria-label="Sponsors" className="mt-24 flex justify-center border-t border-line pt-16">
        <BecomeSponsor />
      </section>
    )
  }

  return (
    <section aria-labelledby="home-sponsors" className="mt-24 flex flex-col items-center gap-10 border-t border-line pt-20">
      <h2 id="home-sponsors" className="max-w-md text-center text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
        oxyn is backed and supported by the finest
      </h2>

      {tiers.map((tier, i) => (
        <Group key={tier.id} title={tier.name}>
          <ul className="flex w-full flex-wrap justify-center gap-3">
            {tier.sponsors.map((s) => (
              <li key={s.id} className={i === 0 ? TOP : REST}>
                <Tile href={s.website} title={s.name} className={i === 0 ? 'h-40' : 'h-24'}>
                  {s.logoUrl ? (
                    <img
                      src={s.logoUrl}
                      alt={s.name}
                      className={cn('object-contain', i === 0 ? 'max-h-14 max-w-[60%]' : 'max-h-8 max-w-[70%]')}
                    />
                  ) : (
                    <span className={cn('font-semibold tracking-tight', i === 0 ? 'text-3xl' : 'text-lg')}>{s.name}</span>
                  )}
                </Tile>
              </li>
            ))}
            {tier.spotsLeft !== 0 && (
              <li className={i === 0 ? TOP : REST}>
                <YourLogo className={i === 0 ? 'h-40' : 'h-24'} />
              </li>
            )}
          </ul>
        </Group>
      ))}

      {data.platform.length > 0 && (
        <Group title="Platform sponsors">
          <ul className="flex w-full flex-wrap justify-center gap-3">
            {data.platform.map((p) => (
              <li key={p.name} className={THIRD}>
                <Tile href={p.href} title={p.name} className="h-32 flex-col gap-3">
                  <img src={p.logoUrl} alt={p.name} className="max-h-9 max-w-[60%] object-contain" />
                  {p.label && <span className="font-mono text-[10px] tracking-[0.15em] text-faint uppercase">{p.label}</span>}
                </Tile>
              </li>
            ))}
            <li className={THIRD}>
              <YourLogo className="h-32" />
            </li>
          </ul>
        </Group>
      )}

      <Link to="/sponsors" className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted transition-colors hover:text-fg">
        <span className="link-underline">Become a sponsor</span>
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <h3 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">{title}</h3>
      {children}
    </div>
  )
}

function Tile({ href, title, className, children }: { href: string | null; title: string; className: string; children: React.ReactNode }) {
  const cls = cn('flex w-full items-center justify-center rounded-3xl bg-surface shadow-card transition-shadow', className)
  return href ? (
    <a href={href} target="_blank" rel="noreferrer sponsored" title={title} className={cn(cls, 'press hover:shadow-card-hover')}>
      {children}
    </a>
  ) : (
    <div className={cls}>{children}</div>
  )
}

function YourLogo({ className }: { className: string }) {
  return (
    <Link
      to="/sponsors"
      className={cn(
        'press group flex w-full items-center justify-center gap-2 rounded-3xl bg-surface/60 font-mono text-[13px] text-faint shadow-card transition-colors hover:text-fg',
        className,
      )}
    >
      <span aria-hidden="true" className="text-base transition-transform duration-200 group-hover:rotate-90">
        +
      </span>
      Your logo here
    </Link>
  )
}
