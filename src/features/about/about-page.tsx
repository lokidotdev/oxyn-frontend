import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { groups, states } from '#/features/states'
import { BarRing } from '#/registry/bar-ring/bar-ring'
import type { BarRingAnimation } from '#/registry/bar-ring/bar-ring'
import { useDotColor } from '#/shared/lib/theme'
import { CodeBlock } from '#/shared/ui/code-block'
import { ArrowUpRightIcon, GitHubIcon } from '#/shared/ui/icons'
import { REPO_URL } from '#/shared/ui/site-header'

const AUTHOR_URL = 'https://x.com/lokidotdev'

/** The demo walks one agent turn: find the file, read it, edit it. */
const TURN: { animation: BarRingAnimation; label: string }[] = [
  { animation: 'seek', label: 'Searching for auth.ts' },
  { animation: 'read', label: 'Reading auth.ts' },
  { animation: 'write', label: 'Editing auth.ts' },
]

const STEP_MS = 3200

const PRINCIPLES = [
  {
    title: 'One motion per state',
    body: 'Every loader is drawn for a specific thing an agent does: reading, editing, searching, calling a tool, waiting on you. Not just to look busy.',
  },
  {
    title: 'States glide, never cut',
    body: 'Each row ships as one group component. Change its animation prop and the same dots or bars morph from one motion into the next.',
  },
  {
    title: 'Quiet by default',
    body: 'Every loader renders role="status" with a label, holds still under prefers-reduced-motion, and coasts to a stop when paused.',
  },
  {
    title: 'You own the file',
    body: 'Installed with the shadcn CLI as one self-contained file that imports only from react. Read it, edit it, keep it.',
  },
]

const NOT_FOR = ['Determinate progress bars', 'Skeleton screens', 'Vue, Svelte or plain HTML']

const MCP_CONFIG = `{ "mcpServers": { "oxyn": { "type": "http", "url": "https://oxyn.space/mcp" } } }`

export function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <section className="grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <span className="font-mono text-xs tracking-wider text-faint uppercase">About</span>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            A spinner says something is happening. oxyn says what.
          </h1>
          <p className="mt-5 max-w-xl font-mono text-[15px] leading-relaxed text-muted">
            An agent interface usually knows what it's waiting on: a file being read, a command running, a tool call out
            to an API. oxyn is a library of {states.length} animated React loaders that give each of those states its own
            motion, so people can tell them apart at a glance.
          </p>
        </div>
        <TurnDemo />
      </section>

      <div className="flex flex-col gap-10">
        <Section eyebrow="Principles" lede="The rules every loader follows.">
          {/* Read-only cards: no hover lift or pointer, so nothing suggests they're clickable. Hierarchy comes from
              size, weight and leading together; the index recedes so the title is the first thing the eye lands on. */}
          <ol className="grid gap-3 sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="flex flex-col rounded-2xl bg-surface p-5 shadow-card sm:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-base leading-snug font-semibold tracking-tight text-balance text-fg">{p.title}</h3>
                  <span aria-hidden="true" className="font-mono text-[11px] text-faint tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-2.5 max-w-[48ch] text-sm leading-relaxed text-pretty text-muted">{p.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section eyebrow="The rows" lede={`${groups.length} shapes, each with its own set of motions.`}>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {groups.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/components/$slug"
                  params={{ slug: g.slug }}
                  className="group flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{g.name}</span>
                    <span className="font-mono text-[11px] text-faint tabular-nums">{g.animations?.length ?? 1} animations</span>
                  </span>
                  <span className="shrink-0 text-muted transition-colors group-hover:text-fg">
                    <ArrowUpRightIcon />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="Where it stops" lede="oxyn is for indeterminate waits in React. It doesn't cover:">
          <ul className="flex flex-wrap gap-2">
            {NOT_FOR.map((item) => (
              <li key={item} className="rounded-full border border-line-strong px-3 py-1.5 font-mono text-xs text-muted">
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="For assistants" lede="An MCP server lets an assistant pick a loader by what your agent is doing, then install it.">
          <CodeBlock code={MCP_CONFIG} />
          <p className="mt-3 font-mono text-[13px] leading-relaxed text-muted">
            Prefer docs? The whole library is in{' '}
            <a href="/llms.txt" className="group text-fg">
              <span className="link-underline">llms.txt</span>
            </a>{' '}
            and{' '}
            <a href="/llms-full.txt" className="group text-fg">
              <span className="link-underline">llms-full.txt</span>
            </a>
            .
          </p>
        </Section>

        <Section eyebrow="Who" lede="">
          <p className="max-w-2xl font-mono text-[15px] leading-relaxed text-muted">
            oxyn is built by{' '}
            <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="group text-fg">
              <span className="link-underline">lokidotdev</span>
            </a>
            . It's early and pre-1.0, so props may still change between releases. MIT licensed; bug reports, new states and
            new animations are welcome.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/"
              className="press inline-flex h-8 items-center rounded-lg border border-line bg-raised px-2.5 font-mono text-xs text-fg transition-colors hover:border-line-strong"
            >
              Browse the loaders
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 font-mono text-xs text-fg transition-colors hover:border-line-strong"
            >
              <GitHubIcon size={12} />
              GitHub
              <ArrowUpRightIcon />
            </a>
          </div>
        </Section>
      </div>
    </main>
  )
}

function Section({ eyebrow, lede, children }: { eyebrow: string; lede: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-mono text-xs tracking-wider text-faint uppercase">{eyebrow}</h2>
      {lede && <p className="mt-2 font-mono text-sm text-muted">{lede}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** One BarRing stepping through an agent turn, so the page shows the idea instead of only describing it. */
function TurnDemo() {
  const color = useDotColor()
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % TURN.length), STEP_MS)
    return () => clearInterval(id)
  }, [])
  const current = TURN[step]

  return (
    <figure className="rounded-2xl bg-surface p-2 shadow-card">
      <div className="stage flex aspect-square items-center justify-center rounded-xl">
        <BarRing animation={current.animation} label={current.label} color={color} size={200} />
      </div>
      <figcaption className="flex items-center justify-between gap-3 p-1 pt-3" aria-hidden="true">
        <span className="font-mono text-xs text-fg">{current.label}</span>
        <span className="flex gap-1.5">
          {TURN.map((t, i) => (
            <span key={t.animation} className={`size-1.5 rounded-full transition-colors ${i === step ? 'bg-fg' : 'bg-line-strong'}`} />
          ))}
        </span>
      </figcaption>
    </figure>
  )
}
