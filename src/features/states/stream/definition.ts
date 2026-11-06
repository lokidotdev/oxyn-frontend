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
    description: 'Seconds for output lines to land on every row once, top to bottom.',
    default: 1.6,
    min: 0.6,
    max: 4,
    step: 0.1,
    unit: 's',
  },
  {
    kind: 'slider',
    key: 'trail',
    label: 'Trail',
    description: 'Older lines still lit behind the newest; each steps down as the next lands. Keep it to 3–4 so the newest line stays clear.',
    default: 3,
    min: 1,
    max: 6,
    step: 0.5,
  },
  { ...p.minOpacity, description: 'Opacity of resting dots. The newest line is always fully opaque.' },
  p.color,
  p.paused,
]

export const squareStream = defineState({
  slug: 'square-stream',
  summary: 'A flat square of dots where output lines land row by row, the newest brightest, like a terminal. For running a command.',
  shape: 'square',
  name: 'Square Stream',
  description:
    'A flat square of dots where lines of uneven length land quickly row by row from the top. The newest line is brightest and older ones dim as new ones arrive, so it reads like scrolling output while no dot moves. Use it while an agent runs a command.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
