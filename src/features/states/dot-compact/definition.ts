import { sphereParams as p } from '../sphere-params'
import { defineState } from '../define-state'

export const dotCompact = defineState({
  slug: 'dot-compact',
  summary: 'A dot sphere where two inward waves leave the poles and meet at the equator as a thin waist, for compacting context.',
  shape: 'globe',
  name: 'Dot Compact',
  description:
    'Two narrow waves set off from the poles, pulling rows inward as they travel, and meet at the equator. The orb holds there briefly with a thin waist, then lets go. Dots never rotate or change height; on the spiral the waves become diagonal stripes that follow the spiral arms.',
  dimension: '2.5D',
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
      description: "How far the waves pull the dots in toward the vertical axis, as a fraction of the orb's radius.",
      default: 0.2,
      min: 0,
      max: 0.5,
      step: 0.01,
    },
    {
      kind: 'slider',
      key: 'duration',
      label: 'Duration',
      description: 'Seconds for one squeeze: the waves meeting at the equator, the waist holding, and letting go.',
      default: 1.8,
      min: 0.4,
      max: 4,
      step: 0.1,
      unit: 's',
    },
    {
      ...p.gap,
      description: 'Seconds the orb rests after the waist lets go, before the next squeeze.',
      default: 0.4,
    },
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
})
