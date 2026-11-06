import { sphereParams as p } from '../sphere-params'
import { defineState } from '../define-state'

export const dotSweep = defineState({
  slug: 'dot-sweep',
  summary: 'A still dot sphere where one lit column sweeps around the axis like a radar with a short fading trail, for searching.',
  shape: 'globe',
  name: 'Dot Sweep',
  description:
    'One meridian of dots lights up and sweeps around the vertical axis like a radar, a short trail fading behind it. Dots never move; only their brightness and size change. On the grid the sweep lights one column at a time, on the rings it follows the angle around the axis, and on the spiral it follows an arm.',
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
      description: 'Seconds for the sweep to go once around the orb.',
      default: 2.4,
      min: 0.6,
      max: 6,
      step: 0.1,
      unit: 's',
    },
    { ...p.direction, description: 'Which way the sweep turns around the vertical axis.' },
    p.tilt,
    p.backOpacity,
    p.color,
    p.paused,
  ],
})
