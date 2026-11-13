import { sheetParams as p } from '../sheet-params'
import { defineState } from '../define-state'
import type { StateDefinition } from '../types'

interface BarParams {
  extend: string
  duration?: { description: string; default: number }
  stagger?: { description: string; default: number }
  heads?: boolean
  /** Extra params this animation alone takes, placed after the timing. */
  extra?: StateDefinition['params']
  /** Leave out the extend param, for an animation that doesn't push. */
  noExtend?: boolean
}

const params = ({ extend, duration, stagger, heads, extra = [], noExtend }: BarParams): StateDefinition['params'] => [
  {
    kind: 'slider',
    key: 'bars',
    label: 'Bars',
    description: 'Number of bars around the ring.',
    default: 36,
    min: 12,
    max: 72,
    step: 1,
  },
  {
    kind: 'slider',
    key: 'barHeight',
    label: 'Bar height',
    description: 'Resting height of each bar in px, pointing away from the center.',
    default: 12,
    min: 2,
    max: 30,
    step: 0.5,
    unit: 'px',
  },
  {
    kind: 'slider',
    key: 'barWidth',
    label: 'Bar width',
    description: 'Thickness of each bar in px. Capped so neighbors never overlap.',
    default: 2,
    min: 1,
    max: 8,
    step: 0.5,
    unit: 'px',
  },
  {
    kind: 'slider',
    key: 'radius',
    label: 'Corner radius',
    description: 'Corner radius of each bar in px.',
    default: 1,
    min: 0,
    max: 4,
    step: 0.5,
    unit: 'px',
  },
  ...(noExtend
    ? []
    : [
        {
          kind: 'slider',
          key: 'extend',
          label: 'Extend',
          description: extend,
          default: 10,
          min: 0,
          max: 30,
          step: 0.5,
          unit: 'px',
        } satisfies StateDefinition['params'][number],
      ]),
  {
    kind: 'slider',
    key: 'duration',
    label: 'Duration',
    description: duration?.description ?? 'Seconds one bar takes to move out and back.',
    default: duration?.default ?? 0.24,
    min: 0.05,
    max: 2,
    step: 0.01,
    unit: 's',
  },
  {
    kind: 'slider',
    key: 'stagger',
    label: 'Stagger',
    description: stagger?.description ?? 'Seconds between one bar starting and the next, going clockwise.',
    default: stagger?.default ?? 0.06,
    min: 0.01,
    max: 0.3,
    step: 0.01,
    unit: 's',
  },
  {
    kind: 'select',
    key: 'direction',
    label: 'Direction',
    description: 'Which way the push carries a bar: away from the center, or toward it.',
    default: 'out',
    options: [
      { value: 'out', label: 'Outward' },
      { value: 'in', label: 'Inward' },
    ],
  },
  ...(heads
    ? [
        {
          kind: 'slider',
          key: 'heads',
          label: 'Heads',
          description: 'Waves travelling round the ring at once, evenly spaced.',
          default: 2,
          min: 1,
          max: 4,
          step: 1,
        } satisfies StateDefinition['params'][number],
      ]
    : []),
  ...extra,
  p.size,
  { ...p.minOpacity, description: 'Opacity of resting bars. Bars at the peak of the wave are always fully opaque.', default: 0.35 },
  { ...p.color, description: 'Bar color.' },
  p.paused,
]

export const barThink = defineState({
  slug: 'bar-think',
  summary: 'A fence of thin bars around a circle, with a bright head trailing a fading tail as it travels round.',
  shape: 'bars',
  name: 'Bar Think',
  description:
    'A fence of thin bars standing around a circle. Each bar snaps longer, outward or inward, as the head reaches it and falls back slowly, so the head drags a tail that fades out behind it.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: "How far the comet's head grows a bar in px. The end away from the push never moves.",
    duration: { description: 'Seconds one bar takes to snap out and fade back: the length of the tail.', default: 0.5 },
    stagger: { description: 'Seconds between one bar starting and the next, going clockwise.', default: 0.05 },
  }),
})

export const barParallel = defineState({
  slug: 'bar-parallel',
  summary: 'A fence of thin bars around a circle, with several evenly spaced waves moving them out or in as they travel round.',
  shape: 'bars',
  name: 'Bar Parallel',
  description:
    'A fence of thin bars standing around a circle. Two or more narrow waves, evenly spaced, travel round the ring together, each moving a few bars outward or inward at a time.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({ extend: 'How far each wave moves a bar in px. The bar keeps its height.', heads: true }),
})

export const barRead = defineState({
  slug: 'bar-read',
  summary: 'A fence of thin bars around a circle, with a small wave lighting them at a steady pace, like reading down lines.',
  shape: 'bars',
  name: 'Bar Read',
  description:
    'A fence of thin bars standing around a circle. A small wave travels round at a steady, unhurried pace, lighting a few bars at a time and barely moving them, like a cursor reading down a file.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: 'How far a full push would grow a bar in px; reading uses about a third of it.',
    duration: { description: 'Seconds one bar stays lit as the reading passes.', default: 0.32 },
    stagger: { description: 'Seconds between one bar lighting and the next, going clockwise.', default: 0.09 },
  }),
})

export const barWrite = defineState({
  slug: 'bar-write',
  summary: 'A fence of thin bars around a circle, typed in bursts until the ring is written, then wiped in order.',
  shape: 'bars',
  name: 'Bar Write',
  description:
    'A fence of thin bars standing around a circle. Going clockwise, bars are typed in bursts of four: each pops and settles to a short mark. Once the ring is written the marks are wiped in the same order.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: 'How far a keystroke grows a bar in px. The mark it leaves is about a third of that.',
    duration: { description: 'Seconds one keystroke takes to pop and settle to its mark.', default: 0.2 },
    stagger: { description: 'Seconds between keystrokes; bars are typed in bursts of four.', default: 0.05 },
  }),
})

export const barSearch = defineState({
  slug: 'bar-search',
  summary: 'A fence of thin bars around a circle, with a wave that runs ahead, backs up and runs on, like searching.',
  shape: 'bars',
  name: 'Bar Search',
  description:
    'A fence of thin bars standing around a circle. A narrow wave runs eight bars forward, slows, backs up three and runs on, like hunting back and forth for a match.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: 'How far the search head moves a bar in px. The bar keeps its height.',
    duration: { description: 'How wide the seek is, in seconds of travel: its width in bars is this ÷ stagger.', default: 0.24 },
    stagger: { description: 'Seconds the seek takes to run past one bar.', default: 0.06 },
  }),
})

export const barStream = defineState({
  slug: 'bar-stream',
  summary: 'A fence of thin bars around a circle, with short pulses chasing round at uneven gaps, like tokens arriving.',
  shape: 'bars',
  name: 'Bar Stream',
  description:
    'A fence of thin bars standing around a circle. Short pulses chase each other clockwise in a burst of three, a pair and a long gap, like tokens streaming in.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: 'How far each pulse grows a bar in px. The end away from the push never moves.',
    duration: { description: 'Seconds one pulse takes to pass a bar.', default: 0.08 },
    stagger: { description: 'Seconds between one bar pulsing and the next, going clockwise.', default: 0.03 },
  }),
})


export const barTransfer = defineState({
  slug: 'bar-transfer',
  summary: 'A fence of thin bars around a circle that fills to a progress, its leading bar pulsing, like an upload or download.',
  shape: 'bars',
  name: 'Bar Transfer',
  description:
    'A fence of thin bars standing around a circle. Bars fill clockwise up to the progress while the leading bar pulses. Use direction out for an upload and in for a download; leave progress out and it fills and drains on a loop.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: 'How far a transferred bar grows in px.',
    duration: { description: 'Seconds one bar takes to grow; the leading bar pulses every four of these.', default: 0.16 },
    stagger: { description: 'Seconds between one bar filling and the next while looping.', default: 0.04 },
    extra: [
      {
        kind: 'slider',
        key: 'progress',
        label: 'Progress',
        description: 'How much has transferred. Leave the prop out in code to fill and drain on a loop.',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  }),
})

export const barPing = defineState({
  slug: 'bar-ping',
  summary: "A fence of thin bars around a circle, with a pulse going out to 6 o'clock and back, like a request and its response.",
  shape: 'bars',
  name: 'Bar Ping',
  description:
    "A fence of thin bars standing around a circle. A pulse leaves 12 o'clock both ways and meets at 6, waits, then comes back to 12, like a request going out and its response returning.",
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: 'How far the ping moves a bar in px. The bar keeps its height.',
    duration: { description: 'Seconds one bar takes to move out and back; the ring waits two of these at each end.', default: 0.2 },
    stagger: { description: "Seconds between one bar moving and the next, out from 12 o'clock both ways and back.", default: 0.04 },
  }),
})

export const barPlan = defineState({
  slug: 'bar-plan',
  summary: 'A fence of thin bars around a circle cut into steps: done steps hold, the current one sweeps, the rest wait.',
  shape: 'bars',
  name: 'Bar Plan',
  description:
    'A fence of thin bars standing around a circle, cut into equal segments, one per step of a plan. Finished steps hold grown, a sweep runs through the current step over and over, and the steps still to come rest.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    extend: 'How far the sweep grows a bar in px. Done steps hold at about 40% of it.',
    duration: { description: 'Seconds one bar takes to grow and settle as the sweep passes.', default: 0.24 },
    stagger: { description: 'Seconds between one bar and the next as the sweep runs through the current step.', default: 0.06 },
    extra: [
      { kind: 'slider', key: 'steps', label: 'Steps', description: 'Steps in the plan, each an equal segment of the ring.', default: 4, min: 2, max: 8, step: 1 },
      {
        kind: 'slider',
        key: 'current',
        label: 'Current step',
        description: 'The step running now, counting from 0. Earlier steps show as done; set it to the step count when all are done.',
        default: 1,
        min: 0,
        max: 8,
        step: 1,
      },
    ],
  }),
})

