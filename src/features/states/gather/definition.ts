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
    description: 'Seconds for the rings to swell in turn from the edge to the center, before the center pops.',
    default: 1.1,
    min: 0.4,
    max: 3,
    step: 0.05,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest after the pop, before the next gather.', default: 0.4 },
  { ...p.minOpacity, description: 'Opacity of resting dots. The center dot is always fully opaque as it pops.' },
  p.color,
  p.paused,
]

export const circleGather = defineState({
  slug: 'circle-gather',
  summary: 'A flat circle of dots where rings swell from the edge inward and the center pops, as if bundled and sent. For uploading.',
  shape: 'circle',
  name: 'Circle Gather',
  description:
    'A flat circle of dots where rings swell in turn from the edge inward, like things being collected, then the center dot pops once with the first ring, as if the bundle were sent. Use it while an agent gathers files to upload.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})
