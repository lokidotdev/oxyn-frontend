import { CircleWave } from '#/registry/circle-wave/circle-wave'
import sourceCircle from '#/registry/circle-wave/circle-wave.tsx?raw'
import { SquareWave } from '#/registry/square-wave/square-wave'
import sourceSquare from '#/registry/square-wave/square-wave.tsx?raw'
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
    description: "Seconds for one dot's full breath (grow, then shrink).",
    default: 1.2,
    min: 0.1,
    max: 3,
    step: 0.1,
    unit: 's',
  },
  { ...p.gap, description: 'Seconds to rest between waves.', default: 0.3 },
  {
    kind: 'slider',
    key: 'spread',
    label: 'Spread',
    description: 'Seconds the far side lags behind the near side. Higher values make a slower, narrower wave.',
    default: 0.9,
    min: 0,
    max: 3,
    step: 0.05,
    unit: 's',
  },
  {
    kind: 'select',
    key: 'direction',
    label: 'Direction',
    description: '"right" sweeps from left to right; "left" sweeps from right to left.',
    default: 'right',
    options: [
      { value: 'right', label: 'Right' },
      { value: 'left', label: 'Left' },
    ],
  },
  p.minOpacity,
  p.color,
  p.paused,
]

export const circleWave: StateDefinition = {
  slug: 'circle-wave',
  shape: 'circle',
  name: 'Circle Wave',
  description:
    'A flat circle of dots that breathes in a sweep from left to right, each column swelling a beat after the one before it.',
  dimension: '2D',
  componentName: 'CircleWave',
  fileName: 'circle-wave.tsx',
  Component: CircleWave,
  source: sourceCircle,
  cardProps: { size: 150 },
  params,
}

export const squareWave: StateDefinition = {
  slug: 'square-wave',
  shape: 'square',
  name: 'Square Wave',
  description:
    'A flat square of dots that breathes in a sweep from left to right, each column swelling a beat after the one before it.',
  dimension: '2D',
  componentName: 'SquareWave',
  fileName: 'square-wave.tsx',
  Component: SquareWave,
  source: sourceSquare,
  cardProps: { size: 150 },
  params,
}
