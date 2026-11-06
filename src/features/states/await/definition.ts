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
    description: 'Seconds for one heartbeat: the double beat, then the rest it settles into.',
    default: 2.4,
    min: 1,
    max: 6,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Extra seconds to rest between heartbeats.', default: 0.6 },
  { ...p.minOpacity, description: 'Opacity of resting dots. The whole sheet sits at this while it waits; the center dot is fully opaque at the beat.' },
  p.color,
  p.paused,
]

export const circleAwait = defineState({
  slug: 'circle-await',
  summary: 'A flat circle of dots resting dim while the center beats slowly, like a heartbeat. For waiting on user approval.',
  shape: 'circle',
  name: 'Circle Await',
  description:
    'A flat circle of dots that rests dim while only the center dot beats, a slow double beat like a heartbeat, the first ring echoing it softly. Calm and patient. Use it while an agent waits for the user to approve.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
