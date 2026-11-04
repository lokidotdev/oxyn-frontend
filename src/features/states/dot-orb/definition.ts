import { DotOrb } from '#/registry/dot-orb/dot-orb'
import source from '#/registry/dot-orb/dot-orb.tsx?raw'
import { sphereParams as p } from '../sphere-params'
import type { StateDefinition } from '../types'

export const dotOrb: StateDefinition = {
  slug: 'dot-orb',
  shape: 'globe',
  name: 'Dot Orb',
  description:
    'A sphere of dots spinning on its vertical axis. Dots on the far side stay visible but shrink and fade, so a flat canvas reads as 3D.',
  dimension: '2.5D',
  componentName: 'DotOrb',
  fileName: 'dot-orb.tsx',
  Component: DotOrb,
  source,
  cardProps: { size: 150 },
  params: [
    p.pattern,
    p.dotSize,
    p.density,
    p.size,
    {
      kind: 'slider',
      key: 'duration',
      label: 'Duration',
      description: 'Seconds for one full 360° turn.',
      default: 3,
      min: 0.1,
      max: 3,
      step: 0.1,
      unit: 's',
    },
    {
      ...p.gap,
      description: 'Seconds to rest between turns. 0 spins continuously; above 0 each turn eases in and out.',
    },
    p.direction,
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
}
