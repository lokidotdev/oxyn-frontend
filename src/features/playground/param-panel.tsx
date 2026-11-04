import type { ParamDef, ParamValue, ParamValues } from '#/shared/lib/params'
import { ColorInput, Field, Toggle } from '#/shared/ui/controls'
import { InlineSlider } from '#/shared/ui/inline-slider'
import { Tabs } from '#/shared/ui/tabs'
import { ResetIcon } from '#/shared/ui/icons'

interface ParamPanelProps {
  schema: ParamDef[]
  values: ParamValues
  onChange: (key: string, value: ParamValue) => void
  onReset: () => void
  dirty: boolean
}

export function ParamPanel({ schema, values, onChange, onReset, dirty }: ParamPanelProps) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium">Parameters</h2>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-40"
        >
          <ResetIcon />
          Reset
        </button>
      </div>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4">
        {schema.map((p) => (
          <ParamControl key={p.key} param={p} value={values[p.key]} onChange={(v) => onChange(p.key, v)} />
        ))}
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
      return (
        <Field label={p.label}>
          <Tabs mode="radio" fill label={p.label} value={value as string} items={p.options} onChange={onChange} />
        </Field>
      )
    case 'color':
      return (
        <Field label={p.label}>
          <ColorInput label={p.label} value={value as string} onChange={onChange} />
        </Field>
      )
    case 'toggle':
      return (
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">{p.label}</span>
          <Toggle label={p.label} value={value as boolean} onChange={onChange} />
        </div>
      )
  }
}
