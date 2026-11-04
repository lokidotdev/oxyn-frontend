export type ParamValue = string | number | boolean

interface BaseParam<T extends ParamValue> {
  key: string
  label: string
  description: string
  default: T
}

export interface SliderParam extends BaseParam<number> {
  kind: 'slider'
  min: number
  max: number
  step: number
  unit?: string
}

export interface SelectParam extends BaseParam<string> {
  kind: 'select'
  options: { value: string; label: string }[]
}

export interface ColorParam extends BaseParam<string> {
  kind: 'color'
}

export interface ToggleParam extends BaseParam<boolean> {
  kind: 'toggle'
}

export type ParamDef = SliderParam | SelectParam | ColorParam | ToggleParam

export type ParamValues = Record<string, ParamValue>

export function defaultValues(schema: ParamDef[]): ParamValues {
  return Object.fromEntries(schema.map((p) => [p.key, p.default]))
}

/** Coerce untrusted input (e.g. URL search params) into valid values for the schema. */
export function coerceValues(schema: ParamDef[], input: Record<string, unknown>): ParamValues {
  const out: ParamValues = {}
  for (const p of schema) {
    const raw = input[p.key]
    switch (p.kind) {
      case 'slider': {
        const n = typeof raw === 'number' ? raw : Number(raw)
        out[p.key] = raw === undefined || Number.isNaN(n) ? p.default : Math.min(p.max, Math.max(p.min, n))
        break
      }
      case 'select':
        out[p.key] = p.options.some((o) => o.value === raw) ? (raw as string) : p.default
        break
      case 'color':
        out[p.key] = typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw : p.default
        break
      case 'toggle':
        out[p.key] = typeof raw === 'boolean' ? raw : raw === 'true' ? true : raw === 'false' ? false : p.default
        break
    }
  }
  return out
}

/** Only the values that differ from their defaults. */
export function changedValues(schema: ParamDef[], values: ParamValues): ParamValues {
  return Object.fromEntries(schema.filter((p) => values[p.key] !== p.default).map((p) => [p.key, values[p.key]]))
}

export function typeLabel(p: ParamDef): string {
  if (p.kind === 'slider') return 'number'
  if (p.kind === 'toggle') return 'boolean'
  if (p.kind === 'select') return p.options.map((o) => `"${o.value}"`).join(' | ')
  return 'string'
}
