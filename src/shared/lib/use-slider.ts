import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export interface SliderOptions {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number) => void
  disabled?: boolean
  'aria-label'?: string
  formatValueText?: (value: number) => string
}

/** Round to the nearest step from `min`, clamped, without float noise. */
export function snapSliderValue(value: number, min: number, max: number, step: number) {
  const snapped = Math.round((value - min) / step) * step + min
  const decimals = step.toFixed(6).replace(/0+$/, '').split('.')[1]?.length ?? 0
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals))
}

export function useSlider({
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled,
  formatValueText,
  'aria-label': ariaLabel,
}: SliderOptions) {
  const [inner, setInner] = useState(defaultValue ?? min)
  const current = value ?? inner
  const ref = useRef<HTMLDivElement>(null)

  // Read through refs so `commit` stays stable across renders mid-drag.
  const latest = useRef({ current, onValueChange, controlled: value !== undefined })
  useLayoutEffect(() => {
    latest.current = { current, onValueChange, controlled: value !== undefined }
  })

  const commit = useCallback(
    (next: number) => {
      const snapped = snapSliderValue(next, min, max, step)
      if (!latest.current.controlled) setInner(snapped)
      if (snapped !== latest.current.current) latest.current.onValueChange?.(snapped)
    },
    [min, max, step],
  )

  return {
    current,
    min,
    max,
    commit,
    trackProps: { ref },
    sliderProps: {
      role: 'slider' as const,
      disabled,
      'aria-label': ariaLabel,
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': current,
      'aria-valuetext': formatValueText?.(current),
      'aria-disabled': disabled,
    },
  }
}
