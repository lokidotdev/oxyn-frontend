import { sheetParams as p } from '../sheet-params'
import { defineState } from '../define-state'
import type { StateDefinition } from '../types'

type Param = StateDefinition['params'][number]

interface WaveParams {
  duration: { description: string; default: number }
  stagger: { description: string; default: number }
  /** Extra params this animation alone takes, placed after the timing. */
  extra?: Param[]
}

const params = ({ duration, stagger, extra = [] }: WaveParams): StateDefinition['params'] => [
  { kind: 'slider', key: 'bars', label: 'Bars', description: 'Number of bars in the row.', default: 9, min: 3, max: 32, step: 1 },
  {
    kind: 'slider',
    key: 'barWidth',
    label: 'Bar width',
    description: 'Width of each bar in px. Width and gap shrink together if the row would overflow.',
    default: 6,
    min: 1,
    max: 16,
    step: 0.5,
    unit: 'px',
  },
  { kind: 'slider', key: 'gap', label: 'Gap', description: 'Space between bars in px.', default: 6, min: 0, max: 16, step: 0.5, unit: 'px' },
  { kind: 'slider', key: 'radius', label: 'Corner radius', description: 'Corner radius of each bar in px; half the width makes pills.', default: 3, min: 0, max: 8, step: 0.5, unit: 'px' },
  { kind: 'slider', key: 'minHeight', label: 'Min height', description: 'Height of a resting bar in px.', default: 15, min: 2, max: 40, step: 1, unit: 'px' },
  { kind: 'slider', key: 'maxHeight', label: 'Max height', description: 'Height of a bar at the peak of the motion in px.', default: 60, min: 16, max: 140, step: 1, unit: 'px' },
  p.size,
  { kind: 'slider', key: 'duration', label: 'Duration', description: duration.description, default: duration.default, min: 0.05, max: 4, step: 0.01, unit: 's' },
  { kind: 'slider', key: 'stagger', label: 'Stagger', description: stagger.description, default: stagger.default, min: 0.01, max: 0.5, step: 0.01, unit: 's' },
  ...extra,
  {
    kind: 'select',
    key: 'align',
    label: 'Align',
    description: 'Where the bars grow from: up and down from the middle, or up from a shared floor.',
    default: 'center',
    options: [
      { value: 'center', label: 'Center' },
      { value: 'bottom', label: 'Bottom' },
    ],
  },
  { ...p.minOpacity, description: 'Opacity of resting bars. Bars at the peak are always fully opaque.', default: 0.35 },
  { ...p.color, description: 'Bar color.' },
  p.paused,
]

export const waveThink = defineState({
  slug: 'wave-think',
  name: 'Wave Think',
  summary: 'A row of upright bars swaying like a voice, each on its own blend of slow waves.',
  description:
    "A row of upright bars, like a voice meter. Every bar sways on its own blend of three slow waves, the middle standing tallest, so the row moves like someone speaking while it thinks.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one sway of the row takes; it repeats seamlessly.", default: 2.4 },
    stagger: { description: "How far apart neighboring bars sway, in seconds of the loop.", default: 0.3 },
  }),
})

export const waveIdle = defineState({
  slug: 'wave-idle',
  name: 'Wave Idle',
  summary: 'A row of upright bars breathing together, barely rising, like a mic waiting for input.',
  description:
    "A row of upright bars that breathe together in one slow swell, starting a beat later toward the ends and barely rising: present, but waiting.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one breath takes.", default: 2.6 },
    stagger: { description: "Seconds the breath takes to reach each bar out from the middle.", default: 0.08 },
  }),
})

export const waveProcess = defineState({
  slug: 'wave-process',
  name: 'Wave Process',
  summary: 'A row of upright bars with a steady wave marching through every bar, left to right.',
  description:
    "A row of upright bars with one steady wave marching through them left to right, every bar always moving, like work running at a constant pace.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds the wave takes to pass one bar.", default: 1.2 },
    stagger: { description: "Seconds between one bar and the next, going left to right.", default: 0.14 },
  }),
})

export const waveLoad = defineState({
  slug: 'wave-load',
  name: 'Wave Load',
  summary: 'A row of upright bars bouncing in turn, left to right, then resting.',
  description:
    "A row of upright bars. Each bar bounces up and back in turn from left to right, then the row rests for a beat before the next pass.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one bar takes to bounce up and back.", default: 0.42 },
    stagger: { description: "Seconds between one bar bouncing and the next, going left to right.", default: 0.1 },
  }),
})

export const waveRead = defineState({
  slug: 'wave-read',
  name: 'Wave Read',
  summary: 'A row of upright bars with a small wave scanning left to right, like eyes down a line.',
  description:
    "A row of upright bars. A small wave scans left to right at a steady, unhurried pace, lighting a few bars and barely growing them, like eyes moving along a line of text.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one bar stays lit as the reading passes.", default: 0.36 },
    stagger: { description: "Seconds between one bar lighting and the next, going left to right.", default: 0.12 },
  }),
})

export const waveWrite = defineState({
  slug: 'wave-write',
  name: 'Wave Write',
  summary: 'A row of upright bars typed in bursts, each leaving a mark, then wiped in order.',
  description:
    "A row of upright bars typed left to right in bursts of three: each bar pops and settles to a short mark. Once the row is written the marks are wiped in the same order.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one keystroke takes to pop and settle to its mark.", default: 0.2 },
    stagger: { description: "Seconds between keystrokes; bars are typed in bursts of three.", default: 0.07 },
  }),
})

export const waveUpload = defineState({
  slug: 'wave-upload',
  name: 'Wave Upload',
  summary: 'A row of upright bars rising from their floor to a progress, the leading bar pulsing.',
  description:
    "A row of upright bars that rise from their floor, left to right, up to the progress while the leading bar pulses. Leave progress out and it fills and drains on a loop.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one bar takes to rise; the leading bar pulses every four of these.", default: 0.2 },
    stagger: { description: "Seconds between one bar rising and the next while looping.", default: 0.07 },
    extra: [
      {
        kind: 'slider',
        key: 'progress',
        label: 'Progress',
        description: 'How much has uploaded. Leave the prop out in code to fill and drain on a loop.',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  }),
})

export const waveEdit = defineState({
  slug: 'wave-edit',
  name: 'Wave Edit',
  summary: 'A row of upright bars where a cursor jumps between spots and the bar there pops.',
  description:
    "A row of upright bars. A cursor jumps between spots across the row; the bar under it pops and its neighbors ripple smaller, like edits landing in different parts of a file.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one edit takes to pop and settle.", default: 0.5 },
    stagger: { description: "Seconds between the edited bar popping and each neighbor out.", default: 0.06 },
  }),
})

export const wavePlan = defineState({
  slug: 'wave-plan',
  name: 'Wave Plan',
  summary: 'A row of upright bars cut into steps: done steps hold, the current one sweeps, the rest wait.',
  description:
    "A row of upright bars cut into equal runs, one per step of a plan. Finished steps hold grown, a sweep runs through the current step over and over, and the steps still to come rest.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one bar takes to grow and settle as the sweep passes.", default: 0.3 },
    stagger: { description: "Seconds between one bar and the next as the sweep runs through the current step.", default: 0.09 },
    extra: [
      { kind: 'slider', key: 'steps', label: 'Steps', description: 'Steps in the plan, each an equal run of bars.', default: 3, min: 2, max: 8, step: 1 },
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

export const waveReason = defineState({
  slug: 'wave-reason',
  name: 'Wave Reason',
  summary: 'A row of upright bars with two waves setting off from either end and crossing in the middle.',
  description:
    "A row of upright bars. Two waves set off from opposite ends, meet and cross in the middle, and carry on to the far side, like weighing one side against the other.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one bar takes to grow and settle as a wave passes.", default: 0.4 },
    stagger: { description: "Seconds between one bar and the next, from each end inward.", default: 0.1 },
  }),
})

export const waveSearch = defineState({
  slug: 'wave-search',
  name: 'Wave Search',
  summary: 'A row of upright bars with a narrow head hunting across, running ahead and backing up.',
  description:
    "A row of upright bars. A narrow head hunts across the row, running ahead, backing up a little and running on, then hunts its way back, like looking for a match.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "How wide the search head is, in seconds of travel: its width in bars is this ÷ stagger.", default: 0.3 },
    stagger: { description: "Seconds the head takes to run past one bar.", default: 0.09 },
  }),
})

export const wavePing = defineState({
  slug: 'wave-ping',
  name: 'Wave Ping',
  summary: 'A row of upright bars with a pulse going out from the middle to both ends and back.',
  description:
    "A row of upright bars. A pulse leaves the middle for both ends, waits, then comes back to the middle, like a request going out and its response returning.",
  shape: 'waves',
  dimension: '2D',
  cardProps: { size: 150 },
  params: params({
    duration: { description: "Seconds one bar takes to grow and settle; the row waits two of these at each end.", default: 0.3 },
    stagger: { description: "Seconds between one bar and the next, out from the middle both ways and back.", default: 0.07 },
  }),
})
