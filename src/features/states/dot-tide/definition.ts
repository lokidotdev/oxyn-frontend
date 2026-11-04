import { DotTide } from '#/registry/dot-tide/dot-tide'
import source from '#/registry/dot-tide/dot-tide.tsx?raw'
import { sphereParams as p } from '../sphere-params'
import type { StateDefinition } from '../types'

export const dotTide: StateDefinition = {
  slug: 'dot-tide',
  shape: 'globe',
  name: 'Dot Tide',
  description:
    'A narrow wave travels down the orb, pulling a few rows of dots inward toward its axis and letting them back out behind it. Dots never rotate or change height; on the spiral they follow the spiral order instead of moving ring by ring.',
  dimension: '2.5D',
  componentName: 'DotTide',
  fileName: 'dot-tide.tsx',
  Component: DotTide,
  source,
  cardProps: { size: 150 },
  params: [
    p.pattern,
    p.dotSize,
    p.density,
    p.size,
    {
      kind: 'slider',
      key: 'depth',
      label: 'Depth',
      description: "How far the wave pulls the dots in toward the vertical axis, as a fraction of the orb's radius.",
      default: 0.2,
      min: 0,
      max: 0.5,
      step: 0.01,
    },
    {
      kind: 'slider',
      key: 'width',
      label: 'Width',
      description: 'How many rows the wave pulls in at once.',
      default: 3.5,
      min: 1,
      max: 8,
      step: 0.5,
    },
    {
      kind: 'slider',
      key: 'duration',
      label: 'Duration',
      description: 'Seconds for the wave to travel from one pole to the other.',
      default: 1.6,
      min: 0.2,
      max: 4,
      step: 0.1,
      unit: 's',
    },
    {
      ...p.gap,
      description: 'Seconds the orb rests after the wave leaves, before the next one.',
      default: 0.4,
    },
    p.from,
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
}
