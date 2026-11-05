import { useEffect, useMemo, useRef, useState } from 'react'
import { ANIMATION_KEY, paramsFor } from '#/features/states'
import type { StateDefinition } from '#/features/states'
import { changedValues, coerceValues, defaultValues } from '#/shared/lib/params'
import type { ParamValue, ParamValues } from '#/shared/lib/params'

/**
 * Param values for `state`, seeded from untrusted `initial` input (e.g. URL search params).
 * Values that differ from their defaults go to `onPersist` once the user stops changing them.
 *
 * On a group the schema follows the chosen animation: switching it keeps the values the user changed
 * that the new animation also takes, and moves everything else to the new animation's defaults.
 */
export function useParamState(state: StateDefinition, initial: Record<string, unknown>, onPersist: (changed: ParamValues) => void) {
  const [values, setValues] = useState(() => coerceValues(paramsFor(state, initial[ANIMATION_KEY]), initial))
  const animation = values[ANIMATION_KEY]
  const schema = useMemo(() => paramsFor(state, animation), [state, animation])
  const dirty = Object.keys(changedValues(schema, values)).length > 0

  // Sliders fire on every pixel; persist once the user settles.
  const persistTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => onPersist(changedValues(schema, values)), 200)
    return () => clearTimeout(persistTimer.current)
  }, [values, schema, onPersist])

  const setParam = (key: string, value: ParamValue) =>
    setValues((v) => {
      if (key !== ANIMATION_KEY || !state.animations) return { ...v, [key]: value }
      const changed = changedValues(paramsFor(state, v[ANIMATION_KEY]), v)
      return coerceValues(paramsFor(state, value), { ...changed, [ANIMATION_KEY]: value })
    })
  const reset = () => setValues(defaultValues(state.params))

  return { values, schema, dirty, setParam, reset }
}
