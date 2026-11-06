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
    description: 'Seconds for one edit: typing its rows in, the cursor blink, and letting go.',
    default: 1.6,
    min: 0.6,
    max: 4,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest between edits.', default: 0.25 },
  { ...p.minOpacity, description: 'Opacity of resting dots. Typed dots are always fully opaque.' },
  p.color,
  p.paused,
]

export const squareEdit = defineState({
  slug: 'square-edit',
  summary: 'A flat square of dots where a few rows are typed in, like the changed lines of a diff. For editing a file.',
  shape: 'square',
  name: 'Square Edit',
  description:
    'A flat square of dots where a block of two or three rows is typed in dot by dot, like the changed lines of a diff. The cursor blinks once, the block lets go, and the next edit lands somewhere else. Use it while an agent edits a file.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
