import { sphereParams as p } from '../sphere-params'
import { defineState } from '../define-state'

export const dotPonder = defineState({
  slug: 'dot-ponder',
  summary: 'A still dot sphere where each row takes a full 360\u00b0 turn in a staggered wave from top to bottom.',
  shape: 'globe',
  name: 'Dot Ponder',
  description:
    'The orb holds still while each row of dots takes a full 360° turn, one after another from top to bottom, so a staggered wave rolls down the sphere.',
  dimension: '2.5D',
  cardProps: { size: 150 },
  params: [
    p.pattern,
    p.dotSize,
    p.density,
    p.size,
    {
      kind: 'slider',
      key: 'duration',
      label: 'Turn duration',
      description: 'Seconds each row takes to complete its 360° turn.',
      default: 1.4,
      min: 0.1,
      max: 3,
      step: 0.1,
      unit: 's',
    },
    {
      kind: 'slider',
      key: 'stagger',
      label: 'Stagger',
      description: 'Seconds between one row starting and the row below it.',
      default: 0.08,
      min: 0,
      max: 0.5,
      step: 0.01,
      unit: 's',
    },
    {
      ...p.gap,
      description: 'Seconds the orb rests after the bottom row finishes, before the next wave.',
      default: 0.6,
    },
    p.direction,
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
})
