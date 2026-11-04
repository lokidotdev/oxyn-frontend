import { useEffect, useRef, useState } from 'react'
import { changedValues, coerceValues, defaultValues } from '#/shared/lib/params'
import type { ParamDef, ParamValue, ParamValues } from '#/shared/lib/params'

/**
 * Param values for `schema`, seeded from untrusted `initial` input (e.g. URL search params).
 * Values that differ from their defaults go to `onPersist` once the user stops changing them.
 */
export function useParamState(schema: ParamDef[], initial: Record<string, unknown>, onPersist: (changed: ParamValues) => void) {
  const [values, setValues] = useState(() => coerceValues(schema, initial))
  const dirty = Object.keys(changedValues(schema, values)).length > 0

  // Sliders fire on every pixel; persist once the user settles.
  const persistTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => onPersist(changedValues(schema, values)), 200)
    return () => clearTimeout(persistTimer.current)
  }, [values, schema, onPersist])

  const setParam = (key: string, value: ParamValue) => setValues((v) => ({ ...v, [key]: value }))
  const reset = () => setValues(defaultValues(schema))

  return { values, dirty, setParam, reset }
}
