import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { StateDefinition } from '#/features/states'
import { changedValues, coerceValues, defaultValues } from '#/shared/lib/params'
import type { ParamValue, ParamValues } from '#/shared/lib/params'
import { Badge } from '#/shared/ui/badge'
import { CodeBlock } from '#/shared/ui/code-block'
import { ArrowLeftIcon } from '#/shared/ui/icons'
import { ParamPanel } from './param-panel'
import { PreviewPanel } from './preview-panel'
import { PropsTable } from './props-table'
import { usageSnippet } from './usage'

interface ComponentPageProps {
  state: StateDefinition
  search: Record<string, unknown>
  /** Persist non-default values (e.g. to the URL). */
  onPersist: (changed: ParamValues) => void
}

export function ComponentPage({ state, search, onPersist }: ComponentPageProps) {
  const [values, setValues] = useState(() => coerceValues(state.params, search))
  const dirty = Object.keys(changedValues(state.params, values)).length > 0

  // Sliders fire on every pixel; write to the URL once the user settles.
  const persistTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => onPersist(changedValues(state.params, values)), 200)
    return () => clearTimeout(persistTimer.current)
  }, [values, state.params, onPersist])

  const setParam = (key: string, value: ParamValue) => setValues((v) => ({ ...v, [key]: value }))
  const reset = () => setValues(defaultValues(state.params))

  const usage = useMemo(() => usageSnippet(state, values), [state, values])
  const install = useInstallCommand(state.slug)

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg">
        <ArrowLeftIcon />
        All components
      </Link>

      {/* DOM order keeps the param panel right under the preview on mobile; on lg it spans both rows on the right. */}
      <div className="mt-6 grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0 space-y-10">
          <header>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{state.name}</h1>
              <Badge>{state.dimension}</Badge>
            </div>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{state.description}</p>
          </header>

          <PreviewPanel state={state} values={values} />
        </div>

        <aside className="lg:row-span-2">
          <div className="lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100dvh-6rem)] lg:flex-col">
            <ParamPanel schema={state.params} values={values} onChange={setParam} onReset={reset} dirty={dirty} />
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          <Section title="Installation" lede="Install with the shadcn CLI, or copy the component file. It only needs React.">
            <CodeBlock code={install} highlighted={false} />
          </Section>

          <Section title="Usage" lede="Updates live with the parameters you set.">
            <CodeBlock code={usage} />
          </Section>

          <Section title="Props">
            <PropsTable schema={state.params} />
          </Section>
        </div>
      </div>
    </main>
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
  const [origin, setOrigin] = useState('https://your-domain.com')
  useEffect(() => setOrigin(window.location.origin), [])
  return `npx shadcn@latest add ${origin}/r/${slug}.json`
}
