import { DotLift } from '#/registry/dot-lift/dot-lift'
import source from '#/registry/dot-lift/dot-lift.tsx?raw'
import { sphereParams as p } from '../sphere-params'
import type { StateDefinition } from '../types'

export const dotLift: StateDefinition = {
  slug: 'dot-lift',
  shape: 'globe',
  name: 'Dot Lift',
  description:
    'The orb holds still while each ring of dots pushes straight outward and settles back into place, one after another from top to bottom. Dots never rotate or change height; on the spiral they follow the spiral order instead of moving ring by ring.',
  dimension: '2.5D',
  componentName: 'DotLift',
  fileName: 'dot-lift.tsx',
  Component: DotLift,
  source,
  cardProps: { size: 150 },
  params: [
    p.pattern,
    p.dotSize,
    p.density,
    p.size,
    {
      kind: 'slider',
      key: 'lift',
      label: 'Lift',
      description: "How far each ring pushes outward before settling back, as a fraction of the orb's radius.",
      default: 0.16,
      min: 0,
      max: 0.4,
      step: 0.01,
    },
    {
      kind: 'slider',
      key: 'duration',
      label: 'Lift duration',
      description: 'Seconds each ring takes to push out and settle back into place.',
      default: 0.5,
      min: 0.1,
      max: 3,
      step: 0.1,
      unit: 's',
    },
    {
      kind: 'slider',
      key: 'stagger',
      label: 'Stagger',
      description: 'Seconds between one ring starting and the next one along.',
      default: 0.14,
      min: 0,
      max: 0.5,
      step: 0.01,
      unit: 's',
    },
    {
      ...p.gap,
      description: 'Seconds the orb rests after the last ring settles, before the next wave.',
      default: 0.5,
    },
    p.from,
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
}
