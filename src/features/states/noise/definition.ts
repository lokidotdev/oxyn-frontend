import { sheetParams as p } from '../sheet-params'
import { defineState } from '../define-state'
import type { ParamDef } from '#/shared/lib/params'

const params: ParamDef[] = [
  {
    kind: 'slider',
    key: 'lines',
    label: 'Lines',
    description: 'Number of concentric rings.',
    default: 4,
    min: 1,
    max: 5,
    step: 1,
  },
  {
    kind: 'slider',
    key: 'lineSpacing',
    label: 'Line spacing',
    description: 'Gap between neighboring rings in px. Keep it low so the rings sit close together.',
    default: 3,
    min: 1,
    max: 12,
    step: 0.5,
    unit: 'px',
  },
  {
    kind: 'slider',
    key: 'lineWidth',
    label: 'Line width',
    description: 'Stroke width of each ring in px.',
    default: 1,
    min: 0.5,
    max: 3,
    step: 0.25,
    unit: 'px',
  },
  {
    kind: 'slider',
    key: 'amplitude',
    label: 'Amplitude',
    description: 'Strength of the noise: how far the outer ring is pushed in or out, in px. Inner rings move proportionally less.',
    default: 8,
    min: 0,
    max: 24,
    step: 0.5,
    unit: 'px',
  },
  {
    kind: 'slider',
    key: 'frequency',
    label: 'Frequency',
    description: 'How many bumps run around a ring. Low values give broad, soft swells; high values give tighter ripples.',
    default: 0.8,
    min: 0.2,
    max: 4,
    step: 0.1,
  },
  {
    kind: 'slider',
    key: 'speed',
    label: 'Speed',
    description: 'How fast the noise drifts over time.',
    default: 0.35,
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    kind: 'slider',
    key: 'spread',
    label: 'Spread',
    description: 'How differently neighboring rings move. 0 keeps them in lockstep; higher lets each ring wander on its own.',
    default: 0.12,
    min: 0,
    max: 1,
    step: 0.01,
  },
  p.size,
  { ...p.minOpacity, description: 'Opacity of the innermost ring. The outer ring is always fully opaque.', default: 0.35 },
  { ...p.color, description: 'Line color.' },
  p.paused,
]

/** `params` with a Duration slider after Speed, for animations that loop. */
function withDuration(base: ParamDef[], defaultValue: number, description: string, max = 8): ParamDef[] {
  const duration: ParamDef = { kind: 'slider', key: 'duration', label: 'Duration', description, default: defaultValue, min: 0.2, max, step: 0.1, unit: 's' }
  const at = base.findIndex((d) => d.key === 'speed') + 1
  return [...base.slice(0, at), duration, ...base.slice(at)]
}

/** `params` with one param's default swapped. */
function withDefault(base: ParamDef[], key: string, value: number): ParamDef[] {
  return base.map((d) => (d.key === key ? ({ ...d, default: value } as ParamDef) : d))
}

const level: ParamDef = {
  kind: 'slider',
  key: 'level',
  label: 'Level',
  description: 'How strong the wobble is (0–1). Feed it a live microphone or audio level; it glides, so raw readings are fine.',
  default: 0.5,
  min: 0,
  max: 1,
  step: 0.01,
}

export const noiseThink = defineState({
  slug: 'noise-think',
  summary: 'Thin concentric rings warped by smooth Perlin noise, rippling in soft curves.',
  shape: 'rings',
  name: 'Noise Think',
  description:
    'Thin concentric rings warped by smooth Perlin noise, so each line swells and settles in soft curves while its neighbors ripple along with it.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDefault(params, 'speed', 0.7),
})

export const noiseRespond = defineState({
  slug: 'noise-respond',
  summary: 'Noise rings with a push travelling outward from the innermost ring, like a drop landing in water.',
  shape: 'rings',
  name: 'Noise Respond',
  description:
    'Thin noise rings that calm down while a push travels outward from the innermost ring, like a drop landing in water. Each ring brightens as the push passes through it.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDuration(params, 3.2, 'Seconds for one push to travel from the innermost ring out through the outer one.'),
})

export const noiseListen = defineState({
  slug: 'noise-listen',
  summary: 'Noise rings whose wobble swells, calms almost to circles, and swells again.',
  shape: 'rings',
  name: 'Noise Listen',
  description:
    'Thin noise rings whose wobble swells and calms almost to perfect circles, over and over. The outer ring leads and each ring inward follows a moment later.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDuration(params, 2.7, 'Seconds for one breath: the wobble swelling, calming and swelling again.'),
})

export const noisePonder = defineState({
  slug: 'noise-ponder',
  summary: 'Noise rings turning around the center, inner rings trailing behind so the shape twists.',
  shape: 'rings',
  name: 'Noise Ponder',
  description:
    'Thin noise rings whose shape turns around the center. Inner rings fall a little behind as the turn winds up, then catch up, so the whole field twists and untwists.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDuration(params, 5.7, 'Seconds for one full turn of the noise around the center.', 12),
})

export const noiseDecide = defineState({
  slug: 'noise-decide',
  summary: 'Noise rings closing up into one bright line, holding, then fanning back out.',
  shape: 'rings',
  name: 'Noise Decide',
  description:
    'Thin noise rings that close up onto the outer ring until they read as one bright line, hold a moment, then fan back out.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDuration(params, 3.8, 'Seconds for one close-up and fan-out.', 12),
})

export const noiseVoice = defineState({
  slug: 'noise-voice',
  summary: 'Noise rings whose wobble follows a level prop, for voice or audio input.',
  shape: 'rings',
  name: 'Noise Voice',
  description:
    'Thin noise rings whose wobble follows the level prop: calm circles at 0, full noise at 1. Feed it a live microphone or audio level; it glides, so raw readings are fine.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: [level, ...withDefault(params, 'speed', 0.7)],
})

const direction: ParamDef = {
  kind: 'select',
  key: 'direction',
  label: 'Direction',
  description: '"out" sends rings from the center to the edge (uploading, sending); "in" brings them from the edge to the center (downloading, receiving).',
  default: 'out',
  options: [
    { value: 'out', label: 'Out' },
    { value: 'in', label: 'In' },
  ],
}

export const noiseTransfer = defineState({
  slug: 'noise-transfer',
  summary: 'Noise rings born calm at the center, flowing out to fade at the edge. For uploading or downloading.',
  shape: 'rings',
  name: 'Noise Transfer',
  description:
    'Thin noise rings that are born as calm circles at the center and travel steadily outward, picking up their wobble, until they fade at the edge. Use it while an agent uploads or sends something; set direction to in for downloading or receiving.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDuration([direction, ...params], 2.4, 'Seconds for one ring to travel from the center to the edge (or back, going in).'),
})

const rate: ParamDef = {
  kind: 'slider',
  key: 'rate',
  label: 'Rate',
  description: 'Tokens per second. Gaps between tokens are uneven, short runs and a few pauses; this sets their average.',
  default: 6,
  min: 1,
  max: 20,
  step: 0.5,
}

export const noiseStream = defineState({
  slug: 'noise-stream',
  summary: 'Noise rings where each token sends a small push out from the center, at uneven gaps. For streaming an answer.',
  shape: 'rings',
  name: 'Noise Stream',
  description:
    'Thin noise rings that calm down while every token sends a small push out from the innermost ring, brightening each ring it passes. Tokens arrive at uneven gaps, so a burst reads as fast streaming. Use it while an agent streams its answer.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: [rate, ...params],
})

export const noiseAnalyze = defineState({
  slug: 'noise-analyze',
  summary: 'Noise rings pulling tight and bright around one ring, the lens moving slowly in and out. For deep reading or analysis.',
  shape: 'rings',
  name: 'Noise Analyze',
  description:
    'Thin noise rings where a lens of three or four rings closes up around one ring, brightening and calming inside, while the lens glides slowly from the innermost ring to the outer and back. Use it while an agent reads closely or analyzes.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDuration(params, 7.6, 'Seconds for the lens to travel from the innermost ring out to the outer one and back.', 20),
})

export const noiseSearch = defineState({
  slug: 'noise-search',
  summary: 'Noise rings whose wobble grows ring by ring from the center into tight ripples, then calms. For a broad search.',
  shape: 'rings',
  name: 'Noise Search',
  description:
    'Thin noise rings whose wobble grows ring by ring from the center outward, sharpening into tight, fast ripples, then calms the same way. Use it while an agent searches broadly; switch to Noise Decide when it finds what it was after.',
  dimension: '2D',
  cardProps: { size: 150 },
  params: withDuration(params, 4.8, 'Seconds for one scatter: the wobble growing out through the rings, then calming.'),
})
