import { sheetParams as p } from '../sheet-params'
import { defineState } from '../define-state'
import type { ParamDef } from '#/shared/lib/params'

const params: ParamDef[] = [
  {
    kind: 'slider',
    key: 'lines',
    label: 'Lines',
    description: 'Number of concentric rings.',
    default: 3,
    min: 1,
    max: 6,
    step: 1,
  },
  {
    kind: 'slider',
    key: 'cuts',
    label: 'Cuts',
    description: 'Cuts in each ring. The ring is split into this many equal arcs.',
    default: 3,
    min: 1,
    max: 8,
    step: 1,
  },
  {
    kind: 'slider',
    key: 'cutSpacing',
    label: 'Cut spacing',
    description: 'Angular width of each cut in degrees. 0 closes the rings.',
    default: 30,
    min: 0,
    max: 90,
    step: 1,
    unit: '°',
  },
  {
    kind: 'slider',
    key: 'lineSpacing',
    label: 'Line spacing',
    description: 'Gap between neighboring rings in px.',
    default: 8,
    min: 2,
    max: 20,
    step: 0.5,
    unit: 'px',
  },
  {
    kind: 'slider',
    key: 'lineWidth',
    label: 'Line width',
    description: 'Stroke width of each ring in px.',
    default: 1.5,
    min: 0.5,
    max: 4,
    step: 0.25,
    unit: 'px',
  },
  {
    kind: 'slider',
    key: 'speed',
    label: 'Speed',
    description: 'Pace of the animation, in turns per second of the outer ring at a steady spin.',
    default: 0.3,
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    kind: 'toggle',
    key: 'alternate',
    label: 'Alternate',
    description: 'Turn neighboring rings in opposite directions.',
    default: true,
  },
  p.size,
  { ...p.minOpacity, description: 'Opacity of the innermost ring. The outer ring is always fully opaque.', default: 0.4 },
  { ...p.color, description: 'Line color.' },
  p.paused,
]

export const arcSpin = defineState({
  slug: 'arc-spin',
  summary: 'Concentric rings broken into arcs, turning steadily around the center.',
  shape: 'arcs',
  name: 'Arc Spin',
  description:
    'Concentric rings broken into arcs by evenly spaced cuts, turning steadily around the center with neighbors spinning against each other.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcChase = defineState({
  slug: 'arc-chase',
  summary: 'Arcs whose heads run ahead and tails catch up, stretching and shrinking as they turn.',
  shape: 'arcs',
  name: 'Arc Chase',
  description:
    "Concentric rings of arcs where each arc's head runs ahead and its tail catches up, so the arcs stretch and shrink as they turn. Each ring runs a moment behind the one outside it.",
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcStep = defineState({
  slug: 'arc-step',
  summary: 'Rings of arcs that each turn exactly one arc and hold, stepping inward like the dials of a lock.',
  shape: 'arcs',
  name: 'Arc Step',
  description:
    'Concentric rings of arcs that each turn exactly one arc, then hold. The step starts at the outer ring and works inward like the dials of a combination lock, each ring brightening while it moves.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcGather = defineState({
  slug: 'arc-gather',
  summary: 'Rings of arcs whose cuts close into whole rings and reopen, one ring after another going inward.',
  shape: 'arcs',
  name: 'Arc Gather',
  description:
    'Concentric rings of arcs drifting slowly while their cuts close until each ring is whole, then reopen. The closing travels inward, a few rings at a time.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcRipple = defineState({
  slug: 'arc-ripple',
  summary: 'Rings of arcs pulling inward and letting go, the pull travelling from the outer ring to the inner one.',
  shape: 'arcs',
  name: 'Arc Ripple',
  description:
    'Concentric rings of arcs drifting slowly while each ring pulls toward the center and lets go. The pull travels from the outer ring inward, brightening the rings it passes through.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcGears = defineState({
  slug: 'arc-gears',
  summary: 'Rings of arcs turning at whole-number speed ratios, so their cuts line up on a regular beat.',
  shape: 'arcs',
  name: 'Arc Gears',
  description:
    "Concentric rings of arcs turning like gears: each ring inward turns one step faster than the one outside it, so every ring's cuts line up again on a regular beat.",
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcComet = defineState({
  slug: 'arc-comet',
  summary: 'Rings of arcs turning steadily, each arc fading from a bright head to a faint tail.',
  shape: 'arcs',
  name: 'Arc Comet',
  description:
    'Concentric rings of arcs turning steadily, each arc fading from a bright head to a faint tail so the direction of travel reads at a glance.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcUnlock = defineState({
  slug: 'arc-unlock',
  summary: 'Rings of arcs clicking round like a lock trying combinations, then lining up. For searching or matching.',
  shape: 'arcs',
  name: 'Arc Unlock',
  description:
    'Concentric rings of arcs that click round by whole arcs in different amounts, like a combination lock trying codes. Then every cut lines up, the rings glow while they hold, and they fall back to rest. Use it while an agent searches or looks for a match.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcWrite = defineState({
  slug: 'arc-write',
  summary: 'Rings of arcs that draw themselves on and erase from the tail, one ring after another going inward. For writing or editing.',
  shape: 'arcs',
  name: 'Arc Write',
  description:
    'Concentric rings of arcs that draw themselves on from the tail, hold, then erase from the tail, each pass one arc further round. The writing works inward from the outer ring, a few rings at a time. Use it while an agent writes or edits.',
  dimension: '2D',
  cardProps: { size: 150 },
  params,
})

export const arcTasks = defineState({
  slug: 'arc-tasks',
  summary: 'Rings of arcs each turning at its own pace; finished rings close, dim and stop. For tool calls running in parallel.',
  shape: 'arcs',
  name: 'Arc Tasks',
  description:
    'Concentric rings of arcs, each one a running call turning at its own pace, surging and easing off on its own beat. As calls finish, rings close into whole circles, dim and stop, from the innermost outward. Use it while an agent runs several tool calls in parallel.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: [
    ...params,
    {
      kind: 'slider',
      key: 'active',
      label: 'Active',
      description: 'Calls still running, counting inward from the outer ring; the rings inside them close, dim and stop. Leave the prop out in code for all running.',
      default: 6,
      min: 0,
      max: 6,
      step: 1,
    },
  ],
})

export const arcProgress = defineState({
  slug: 'arc-progress',
  summary: "Rings of arcs whose outer ring lights clockwise from 12 o'clock up to a progress. For an upload or download.",
  shape: 'arcs',
  name: 'Arc Progress',
  description:
    "Concentric rings of arcs. The outer ring lights clockwise from 12 o'clock up to the progress over a faint track while the inner rings turn slowly to show it is working; leave progress out and it fills and empties on a loop. Use it while an agent uploads or downloads.",
  dimension: '2D',
  cardProps: { size: 150 },
  params: [
    ...params,
    {
      kind: 'slider',
      key: 'progress',
      label: 'Progress',
      description: 'How much has transferred. Leave the prop out in code to fill and empty on a loop.',
      default: 0.6,
      min: 0,
      max: 1,
      step: 0.01,
    },
  ],
})
