import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { StateDefinition } from '#/features/states'
import type { ParamValues } from '#/shared/lib/params'
import { AutoHeight } from '#/shared/ui/auto-height'
import { CodeBlock } from '#/shared/ui/code-block'
import { ArrowLeftIcon } from '#/shared/ui/icons'
import { ParamPanel } from './param-panel'
import { PreviewPanel } from './preview-panel'
import { PropsTable } from './props-table'
import { usageSnippet } from './usage'
import { useParamState } from './use-param-state'
import { useFitViewport } from './use-fit-viewport'

interface ComponentPageProps {
  state: StateDefinition
  search: Record<string, unknown>
  /** Persist non-default values (e.g. to the URL). */
  onPersist: (changed: ParamValues) => void
}

export function ComponentPage({ state, search, onPersist }: ComponentPageProps) {
  const { values, schema, dirty, setParam, reset } = useParamState(state, search, onPersist)
  const usage = useMemo(() => usageSnippet(state, schema, values), [state, schema, values])
  const install = useInstallCommand(state.slug)
  const panelRef = useFitViewport<HTMLDivElement>()

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6">
      <Link to="/" className="press group inline-flex origin-left items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeftIcon />
        <span className="link-underline">All components</span>
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{state.name}</h1>
        <p className="mt-3 max-w-2xl font-mono text-[15px] leading-relaxed text-muted">{state.description}</p>
      </header>

      {/* The header spans the page, so the panel's top edge lines up with the preview card's.
          DOM order keeps the panel right under the preview on mobile; on lg it spans both rows on the right. */}
      <div className="mt-10 grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0">
          <PreviewPanel state={state} values={values} />
        </div>

        <aside className="lg:row-span-2">
          <div ref={panelRef} className="lg:sticky lg:top-20 lg:flex lg:flex-col">
            <ParamPanel schema={schema} values={values} onChange={setParam} onReset={reset} dirty={dirty} />
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
        </div>
      </div>
    </main>
  )
}

function Section({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs tracking-wider text-faint uppercase">{title}</h2>
      {lede && <p className="mt-2 mb-3 font-mono text-sm text-muted">{lede}</p>}
      <div className={lede ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

function useInstallCommand(slug: string) {
  const [origin, setOrigin] = useState('https://your-domain.com')
  useEffect(() => setOrigin(window.location.origin), [])
  return `npx shadcn@latest add ${origin}/r/${slug}.json`
}

