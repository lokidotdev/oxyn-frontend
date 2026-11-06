import { ANIMATION_KEY } from '#/features/states'
import type { ParamDef, ParamValue, ParamValues } from '#/shared/lib/params'
import { ColorInput, Field, Toggle } from '#/shared/ui/controls'
import { InlineSlider } from '#/shared/ui/inline-slider'
import { Select } from '#/shared/ui/select'
import { Tabs } from '#/shared/ui/tabs'
import { ResetIcon } from '#/shared/ui/icons'
import { useDotColor } from '#/shared/lib/theme'
import { useEffect, useRef, useState } from 'react'

interface ParamPanelProps {
  schema: ParamDef[]
  values: ParamValues
  onChange: (key: string, value: ParamValue) => void
  onReset: () => void
  dirty: boolean
}

export function ParamPanel({ schema, values, onChange, onReset, dirty }: ParamPanelProps) {
  const { ref: scrollRef, mask } = useEdgeFade<HTMLDivElement>()
  return (
    // Same shell as PreviewPanel: an 8px-padded card, a toolbar row, then an inset well.
    <div className="flex min-h-0 flex-col rounded-2xl bg-surface p-2 shadow-card">
      <div className="flex shrink-0 items-center justify-between gap-2 p-1 pb-3">
        <h2 className="flex h-[34px] items-center px-2 font-mono text-xs text-fg">Parameters</h2>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="press hover-spin inline-flex h-8 items-center gap-1.5 rounded-lg bg-button px-2.5 font-mono text-xs text-fg shadow-card hover:shadow-card-hover disabled:pointer-events-none disabled:opacity-40"
        >
          <ResetIcon />
          Reset
        </button>
      </div>
      {/* The scroller reaches the card's own border while the well is drawn 8px short of it,
          so the scrollbar runs in the gap between the well's border and the card's. */}
      <div className="relative -mr-2 flex min-h-0 flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-2 left-0 rounded-xl border border-line bg-bg/40" />
        <div
          ref={scrollRef}
          style={{ maskImage: mask, WebkitMaskImage: mask }}
          className="gutter-scroll relative min-h-0 space-y-6 overflow-y-auto overscroll-contain py-4 pr-6 pl-4"
        >
          {schema.map((p) => (
            <ParamControl key={p.key} param={p} value={values[p.key]} onChange={(v) => onChange(p.key, v)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ParamControl({ param: p, value, onChange }: { param: ParamDef; value: ParamValue; onChange: (v: ParamValue) => void }) {
  switch (p.kind) {
    case 'slider': {
      const decimals = String(p.step).split('.')[1]?.length ?? 0
      return (
        <InlineSlider
          label={p.label}
          value={value as number}
          min={p.min}
          max={p.max}
          step={p.step}
          onValueChange={onChange}
          format={(n) => `${n.toFixed(decimals)}${p.unit ?? ''}`}
        />
      )
    }
    case 'select':
      if (p.key === ANIMATION_KEY) {
        return <Select label={p.label} value={value as string} options={p.options} onValueChange={onChange} />
      }
      return (
        <Field label={p.label}>
          <Tabs mode="radio" fill label={p.label} value={value as string} items={p.options} onChange={onChange} />
        </Field>
      )
    case 'color':
      return (
        <Field label={p.label}>
          <ThemedColorInput label={p.label} value={value as string} onChange={onChange} />
        </Field>
      )
    case 'toggle':
      return (
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-mono text-muted">{p.label}</span>
          <Toggle label={p.label} value={value as boolean} onChange={onChange} />
        </div>
      )
  }
}

/** Shows the theme's dot color while the param is still at its default. */
function ThemedColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <ColorInput label={label} value={useDotColor(value)} onChange={onChange} />
}

const FADE = 24

/** Fades the scroller's top/bottom edge only where more params are hidden, so overflow reads at a glance. */
function useEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const top = el.scrollTop > 1
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1
      setEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const child of el.children) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const mask =
    edges.top || edges.bottom
      ? `linear-gradient(to bottom, transparent 0, #000 ${edges.top ? FADE : 0}px, #000 calc(100% - ${edges.bottom ? FADE : 0}px), transparent 100%)`
      : undefined
  return { ref, mask }
}
