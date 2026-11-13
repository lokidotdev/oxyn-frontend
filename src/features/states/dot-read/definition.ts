import { sphereParams as p } from '../sphere-params'
import { defineState } from '../define-state'

export const dotRead = defineState({
  slug: 'dot-read',
  summary: 'A still dot sphere where a thin band of light reads down from top to bottom, for reading a file.',
  shape: 'globe',
  name: 'Dot Read',
  description:
    'A thin band, a row or two deep, travels down the orb at a steady pace, brightening and swelling the dots it passes like the line being read, then rests and starts again at the top. Nothing moves; on the spiral the band becomes a diagonal stripe that follows the spiral arms down the sphere.',
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
      label: 'Duration',
      description: 'Seconds for the band to read from the top pole to the bottom one.',
      default: 2,
      min: 0.4,
      max: 6,
      step: 0.1,
      unit: 's',
    },
    {
      ...p.gap,
      description: 'Seconds the orb rests after the band leaves, before the next read.',
      default: 0.4,
    },
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
})
