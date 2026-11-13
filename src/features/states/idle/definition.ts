import { sheetParams as p } from '../sheet-params'
import { defineState } from '../define-state'
import type { StateDefinition } from '../types'

const params: StateDefinition['params'] = [
  p.dotShape,
  p.dotSize,
  p.scale,
  p.density,
  p.size,
  {
    kind: 'slider',
    key: 'duration',
    label: 'Duration',
    description: 'Seconds for one full breath (grow, then shrink).',
    default: 2.4,
    min: 0.1,
    max: 3,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest between breaths.', default: 0.2 },
  {
    kind: 'slider',
    key: 'ripple',
    label: 'Ripple',
    description: 'Seconds the edge lags behind the center. 0 breathes in sync.',
    default: 0,
    min: 0,
    max: 1.5,
    step: 0.05,
    unit: 's',
  },
  p.minOpacity,
  p.color,
  p.paused,
]

export const circleIdle = defineState({
  slug: 'circle-idle',
  summary: 'A flat circle of dots that grows and shrinks together, with optional center-to-edge ripple.',
  shape: 'circle',
  name: 'Circle Idle',
  description:
    'A flat circle of dots that grows and shrinks together, one slow inhale and exhale per loop. Add ripple and the center breathes a beat before the edge.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const squareIdle = defineState({
  slug: 'square-idle',
  summary: 'A flat square of dots that grows and shrinks together, with optional center-to-edge ripple.',
  shape: 'square',
  name: 'Square Idle',
  description:
    'A flat square of dots that grows and shrinks together, one slow inhale and exhale per loop. Add ripple and the center breathes a beat before the edge.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
