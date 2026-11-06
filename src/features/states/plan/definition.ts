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
    description: 'Seconds to tick off every row, top to bottom.',
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
  summary: 'A flat square of dots where rows tick off one at a time and stay ticked, like a checklist. For working through a plan.',
  shape: 'square',
  name: 'Square Plan',
  description:
    'A flat square of dots where rows fill one at a time from the top and stay filled, like items ticked off a todo list; once full, the sheet clears and starts again. Pass progress to show that share of rows ticked instead. Use it while an agent works through a plan.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
