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
    description: 'Seconds the plan would take to tick the whole sheet; each move takes its share of that.',
    default: 4,
    min: 1.5,
    max: 10,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds the full sheet holds before it clears.', default: 0.6 },
  {
    kind: 'slider',
    key: 'progress',
    label: 'Progress',
    description: 'How much of the plan is done, shown as that share of rows ticked. Leave the prop out in code to tick and clear on a loop.',
    default: 0.6,
    min: 0,
    max: 1,
    step: 0.01,
  },
  { ...p.minOpacity, description: 'Opacity of resting dots. Ticked dots are always fully opaque.' },
  p.color,
  p.paused,
]

export const squarePlan = defineState({
  slug: 'square-plan',
  summary: 'A flat square of dots that ticks forward to a stop, blinks, then carries on or steps back, like a plan being worked and revised.',
  shape: 'square',
  name: 'Square Plan',
  description:
    'A flat square of dots that ticks forward in reading order to a stop somewhere on the sheet; the dot it stopped on blinks, then it carries on forward or steps back to the next stop. When it reaches the end the sheet clears and starts again from empty, never turning back from the end. Pass progress to show that share of dots ticked instead. Use it while an agent works through a plan.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
