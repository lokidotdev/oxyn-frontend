import { sphereParams as p } from '../sphere-params'
import { defineState } from '../define-state'

export const dotTwist = defineState({
  slug: 'dot-twist',
  summary: 'A dot sphere that scrambles and solves itself like a twisty cube, one row or column turn at a time.',
  shape: 'globe',
  name: 'Dot Twist',
  description:
    'The orb is cut into thirds like a 3×3 cube. Rows turn a quarter about the vertical axis and columns flip over the top; after a few turns the same turns play back in reverse and the orb solves itself. Every turn lands the dots back on the pattern: rings turn by a whole number of their own dot spacings, and the spiral, which no row turn short of a full one fits, spins its rows all the way round while its columns flip about the spiral’s own axis of symmetry.',
  dimension: '2.5D',
  cardProps: { size: 150 },
  params: [
    { ...p.pattern, default: 'grid' },
    p.dotSize,
    p.density,
    p.size,
    {
      kind: 'slider',
      key: 'moves',
      label: 'Moves',
      description: 'Turns in each scramble. The same turns then play back in reverse to solve the orb.',
      default: 4,
      min: 1,
      max: 10,
      step: 1,
    },
    {
      kind: 'slider',
      key: 'duration',
      label: 'Duration',
      description: 'Seconds for one turn.',
      default: 0.5,
      min: 0.15,
      max: 2,
      step: 0.05,
      unit: 's',
    },
    {
      ...p.gap,
      description: 'Seconds the orb holds once scrambled, and again once solved.',
      default: 0.4,
    },
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
})
