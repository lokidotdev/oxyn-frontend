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
    description: 'Seconds for the ping to reach the edge, and for the echo to come back.',
    default: 0.9,
    min: 0.3,
    max: 2,
    step: 0.05,
    unit: 's',
  },
  {
    kind: 'slider',
    key: 'wait',
    label: 'Wait',
    description: 'Seconds between the ping reaching the edge and the echo setting off back.',
    default: 0.35,
    min: 0,
    max: 1.5,
    step: 0.05,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest after the echo lands, before the next ping.', default: 0.5 },
  {
    kind: 'slider',
    key: 'ringWidth',
    label: 'Ring width',
    description: 'Thickness of the ring of large dots, as a fraction of the sheet radius.',
    default: 0.3,
    min: 0.1,
    max: 1,
    step: 0.05,
  },
  { ...p.minOpacity, description: 'Opacity of resting dots. Dots inside the outgoing ring are always fully opaque.' },
  p.color,
  p.paused,
]

export const circlePing = defineState({
  slug: 'circle-ping',
  summary: 'A flat circle of dots sending a ring out and getting a fainter echo back. For a tool call or request.',
  shape: 'circle',
  name: 'Circle Ping',
  description:
    'A flat circle of dots where a ring leaves the center for the edge, waits, and a fainter echo travels back in, like a request going out and its response coming home. Use it while an agent waits on a tool call.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
