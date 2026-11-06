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
    description: 'Seconds for one turn of the sweep.',
    default: 2,
    min: 0.8,
    max: 5,
    step: 0.1,
    unit: 's',
  },
  { ...p.minOpacity, description: "Opacity of resting dots. Dots at the sweep's edge are always fully opaque." },
  p.color,
  p.paused,
]

export const circleRadar = defineState({
  slug: 'circle-radar',
  summary: 'A flat circle of dots swept by a turning wedge that leaves a fading trail, like radar. For searching the web.',
  shape: 'circle',
  name: 'Circle Radar',
  description:
    'A flat circle of dots where a wedge sweeps clockwise around the center at a steady pace, swelling the dots it passes and leaving a fading trail, like a radar screen. Use it while an agent searches the web.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
