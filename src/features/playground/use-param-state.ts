import { useEffect, useMemo, useRef, useState } from 'react'
import { ANIMATION_KEY, paramsFor } from '#/features/states'
import type { StateDefinition } from '#/features/states'
import { changedValues, coerceValues } from '#/shared/lib/params'
import type { ParamValue, ParamValues } from '#/shared/lib/params'

/**
 * Param values for `state`, seeded from untrusted `initial` input (e.g. URL search params).
 * Values that differ from their defaults go to `onPersist` once the user stops changing them.
 *
 * On a group the schema follows the chosen animation, and switching it changes nothing else: every value
 * the user set is kept, including ones the new animation doesn't take, so switching back finds them again.
 * Only set values are stored; the rest fall to the running animation's own defaults.
 */
export function useParamState(state: StateDefinition, initial: Record<string, unknown>, onPersist: (changed: ParamValues) => void) {
  const [stored, setStored] = useState(() => {
    const seed = paramsFor(state, initial[ANIMATION_KEY])
    return changedValues(seed, coerceValues(seed, initial))
  })
  const animation = stored[ANIMATION_KEY]
  const schema = useMemo(() => paramsFor(state, animation), [state, animation])
  // What runs: each prop the animation takes, at its stored value, or its default where none is valid for it.
  const values = useMemo(() => coerceValues(schema, stored), [schema, stored])
  const dirty = Object.keys(changedValues(schema, values)).length > 0

  // Sliders fire on every pixel; persist once the user settles.
  const persistTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => onPersist(changedValues(schema, values)), 200)
    return () => clearTimeout(persistTimer.current)
  }, [values, schema, onPersist])

  const setParam = (key: string, value: ParamValue) => setStored((v) => ({ ...v, [key]: value }))
  const reset = () => setStored({})

  return { values, schema, dirty, setParam, reset }
}
