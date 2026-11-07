import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ANIMATION_KEY, relatedTo, states, useCaseFor } from '#/features/states'
import type { StateDefinition } from '#/features/states'
import { changedValues } from '#/shared/lib/params'
import type { ParamDef, ParamValue, ParamValues } from '#/shared/lib/params'
import { installCommand } from '#/shared/lib/site'
import { AutoHeight } from '#/shared/ui/auto-height'
import { CodeBlock } from '#/shared/ui/code-block'
import { ArrowLeftIcon, ArrowUpRightIcon } from '#/shared/ui/icons'
import { ParamPanel } from './param-panel'
import { PreviewPanel } from './preview-panel'
import { PropsTable } from './props-table'
import { usageSnippet } from './usage'
import { useParamState } from './use-param-state'
import { useFitViewport } from './use-fit-viewport'

interface ComponentPageProps {
  state: StateDefinition
  /** The component's shippable single file. */
  source: string
  search: Record<string, unknown>
  /** Persist non-default values (e.g. to the URL). */
  onPersist: (changed: ParamValues) => void
  /** Admin SEO override for the heading; the registry's name and description otherwise. */
  heading?: { title: string; description: string } | null
}

export function ComponentPage({ state, source, search, onPersist, heading }: ComponentPageProps) {
  const { values, schema, dirty, setParam, reset } = useParamState(state, search, onPersist)
  const usage = useMemo(() => usageSnippet(state, schema, values), [state, schema, values])
  const install = useInstallCommand(state.slug)
  const panelRef = useFitViewport<HTMLDivElement>()
  const related = useMemo(() => relatedTo(state, states), [state])
  const navigate = useNavigate()

  // A single loader in a grouped row gets the row's animation picker too. Each animation is its own
  // component, so picking one opens that loader's page, carrying over every value the user changed.
  const picker = useMemo((): ParamDef | undefined => {
    const options = related.group?.animations
    if (!options) return undefined
    return {
      kind: 'select',
      key: ANIMATION_KEY,
      label: 'Animation',
      description: 'Each animation is its own component. Picking one opens it, keeping the values you set.',
      default: state.slug,
      options: options.map((a) => ({ value: a.slug, label: a.label })),
    }
  }, [related.group, state.slug])
  const panelSchema = picker ? [picker, ...schema] : schema
  const panelValues = picker ? { ...values, [ANIMATION_KEY]: state.slug } : values
  // Opens another loader in the row, carrying over every value the user changed.
  const switchTo = (slug: string) =>
    slug === state.slug ? Promise.resolve() : navigate({ to: '/components/$slug', params: { slug }, search: changedValues(schema, values), resetScroll: false })
  // The row's short animation names ("Lift", not "Dot Lift"), keyed by each single loader's slug.
  const animationLabels = useMemo(() => new Map(related.group?.animations?.map((a) => [a.slug, a.label])), [related.group])
  const onParamChange = (key: string, value: ParamValue) => {
    if (picker && key === ANIMATION_KEY) {
      void switchTo(String(value))
      return
    }
    setParam(key, value)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
        <Link to="/" className="press group inline-flex origin-left items-center gap-1.5 hover:text-fg">
          <ArrowLeftIcon />
          <span className="link-underline">All components</span>
        </Link>
        {related.group && (
          <>
            <span aria-hidden="true" className="text-faint">/</span>
            <Link to="/components/$slug" params={{ slug: related.group.slug }} className="press group hover:text-fg">
              <span className="link-underline">{related.group.name}</span>
            </Link>
          </>
        )}
      </nav>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{heading?.title ?? state.name}</h1>
        <p className="mt-3 max-w-2xl font-mono text-[15px] leading-relaxed text-muted">{heading?.description ?? state.description}</p>
      </header>

      {/* The header spans the page, so the panel's top edge lines up with the preview card's.
          DOM order keeps the panel right under the preview on mobile; on lg it spans both rows on the right. */}
      <div className="mt-10 grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0">
          <PreviewPanel state={state} source={source} values={values} />
        </div>

        <aside className="lg:row-span-2">
          <div ref={panelRef} className="lg:sticky lg:top-20 lg:flex lg:flex-col">
            <ParamPanel schema={panelSchema} values={panelValues} onChange={onParamChange} onReset={reset} dirty={dirty} />
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          <Section title="Installation" lede="Install with the shadcn CLI, or copy the component file. It only needs React.">
            <CodeBlock code={install} highlighted={false} />
          </Section>

          <Section title="Usage" lede="Updates live with the parameters you set.">
            <AutoHeight className="-m-1">
              <div className="p-1">
                <CodeBlock code={usage} />
              </div>
            </AutoHeight>
          </Section>

          <Section title="Props" lede={state.animations ? 'For the selected animation. Switch it to see the props each one takes.' : undefined}>
            <PropsTable schema={schema} />
          </Section>

          {related.group && (
            <Section title="Switch states" lede={`${state.name} is one of the animations in ${related.group.name}. Use the group when the agent's state changes, and it morphs between them.`}>
              <RelatedLinks items={[related.group]} />
            </Section>
          )}

          {related.siblings.length > 0 &&
            (state.animations ? (
              <Section title="Single loaders" lede="Each animation also ships on its own, for a spot that only ever shows one state.">
                <RelatedLinks items={related.siblings} />
              </Section>
            ) : (
              <Section title="More states">
                <StateSwitcher items={related.siblings} labels={animationLabels} onPick={switchTo} />
              </Section>
            ))}

          {related.sameUse.length > 0 && (
            <Section title="Also for this state">
              <RelatedLinks items={related.sameUse} />
            </Section>
          )}
        </div>
      </div>
    </main>
  )
}

function RelatedLinks({ items }: { items: StateDefinition[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((s) => (
        <li key={s.slug}>
          <Link
            to="/components/$slug"
            params={{ slug: s.slug }}
            className="group flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{s.name}</span>
              <span className="block truncate font-mono text-xs text-muted">{useCaseFor(s)}</span>
            </span>
            <span className="shrink-0 text-muted transition-colors group-hover:text-fg">
              <ArrowUpRightIcon />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Picking a state scrolls back up to the preview, which now runs that animation. */
function StateSwitcher({ items, labels, onPick }: { items: StateDefinition[]; labels: Map<string, string>; onPick: (slug: string) => Promise<void> }) {
  // Scroll once the new page has rendered; a scroll started before it is cut short by the route change.
  const pick = async (slug: string) => {
    await onPick(slug)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((s) => (
        <li key={s.slug}>
          <button
            type="button"
            onClick={() => pick(s.slug)}
            className="press rounded-xl bg-surface px-3 py-2 text-sm font-medium shadow-card transition-shadow hover:shadow-card-hover"
          >
            {labels.get(s.slug) ?? s.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-mono text-xs tracking-wider text-faint uppercase">{title}</h2>
      {lede && <p className="mt-2 mb-3 text-sm text-muted">{lede}</p>}
      <div className={lede ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

function useInstallCommand(slug: string) {
  const [origin, setOrigin] = useState<string>()
  useEffect(() => setOrigin(window.location.origin), [])
  return installCommand(slug, origin)
}

