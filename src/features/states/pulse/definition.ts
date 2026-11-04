import { CirclePulse } from '#/registry/circle-pulse/circle-pulse'
import sourceCircle from '#/registry/circle-pulse/circle-pulse.tsx?raw'
import { SquarePulse } from '#/registry/square-pulse/square-pulse'
import sourceSquare from '#/registry/square-pulse/square-pulse.tsx?raw'
import { sheetParams as p } from '../sheet-params'
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
    description: 'Seconds for one ring to travel across the sheet.',
    default: 1.6,
    min: 0.1,
    max: 3,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest between rings.', default: 0.3 },
  {
    kind: 'slider',
    key: 'ringWidth',
    label: 'Ring width',
    description: 'Thickness of the ring of large dots, as a fraction of the sheet radius.',
    default: 0.35,
    min: 0.1,
    max: 1,
    step: 0.05,
  },
  {
    kind: 'select',
    key: 'direction',
    label: 'Direction',
    description: '"out" spreads from the center to the edge; "in" closes from the edge to the center.',
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

export const circlePulse: StateDefinition = {
  slug: 'circle-pulse',
  shape: 'circle',
  name: 'Circle Pulse',
  description:
    'A flat circle of dots where a round ring of swollen dots spreads from the center to the edge.',
  dimension: '2D',
  componentName: 'CirclePulse',
  fileName: 'circle-pulse.tsx',
  Component: CirclePulse,
  source: sourceCircle,
  cardProps: { size: 150 },
  params,
}

export const squarePulse: StateDefinition = {
  slug: 'square-pulse',
  shape: 'square',
  name: 'Square Pulse',
  description:
    'A flat square of dots where a square ring of swollen dots spreads from the center to the edge.',
  dimension: '2D',
  componentName: 'SquarePulse',
  fileName: 'square-pulse.tsx',
  Component: SquarePulse,
  source: sourceSquare,
  cardProps: { size: 150 },
  params,
}
