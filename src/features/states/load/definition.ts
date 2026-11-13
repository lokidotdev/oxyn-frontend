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
    description: 'Seconds for the ring to cross the sheet once. It crosses twice per loop: once to fill, once to empty.',
    default: 1.2,
    min: 0.1,
    max: 3,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest between loops.', default: 0.3 },
  {
    kind: 'slider',
    key: 'ringWidth',
    label: 'Ring width',
    description: 'Thickness of the ring where dots are growing or shrinking, as a fraction of the sheet radius.',
    default: 0.35,
    min: 0.1,
    max: 1,
    step: 0.05,
  },
  {
    kind: 'select',
    key: 'direction',
    label: 'Direction',
    description: '"out" fills and empties from the center to the edge; "in" from the edge to the center.',
    default: 'out',
    options: [
      { value: 'out', label: 'Out' },
      { value: 'in', label: 'In' },
    ],
  },
  p.minOpacity,
  p.color,
  p.paused,
]

export const squareLoad = defineState({
  slug: 'square-load',
  summary: 'A flat square of dots that swells ring by ring until full, then shrinks back the same way.',
  shape: 'square',
  name: 'Square Load',
  description:
    'A flat square of dots where a ring spreads from the center and leaves every dot it passes swollen. Once the whole square is full, a second ring follows and shrinks them back to rest.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const circleLoad = defineState({
  slug: 'circle-load',
  summary: 'A flat circle of dots that swells ring by ring until full, then shrinks back the same way.',
  shape: 'circle',
  name: 'Circle Load',
  description:
    'A flat circle of dots where a round ring spreads from the center and leaves every dot it passes swollen. Once the whole circle is full, a second ring follows and shrinks them back to rest.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
