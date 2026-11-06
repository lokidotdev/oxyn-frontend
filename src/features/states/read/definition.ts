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
    description: 'Seconds for one read of the whole sheet, from the first dot until the trail clears the last row.',
    default: 3.5,
    min: 1,
    max: 8,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest between reads.', default: 0.4 },
  {
    kind: 'slider',
    key: 'trail',
    label: 'Trail',
    description: 'Rows the fading trail covers behind the read head. Keep it to 3–4 so the line being read stays clear.',
    default: 3,
    min: 1,
    max: 6,
    step: 0.5,
  },
  { ...p.minOpacity, description: 'Opacity of resting dots. The dot under the read head is always fully opaque.' },
  p.color,
  p.paused,
]

export const squareRead = defineState({
  slug: 'square-read',
  summary: 'A flat square of dots read row by row, like eyes moving across lines of text. For reading a file.',
  shape: 'square',
  name: 'Square Read',
  description:
    'A flat square of dots where a read head runs along each row in turn, left to right and top to bottom, like eyes moving across lines of text. A few rows fade behind it. Use it while an agent reads a file.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
