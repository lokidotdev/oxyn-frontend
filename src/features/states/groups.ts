import type { ParamDef, ParamValue } from '#/shared/lib/params'
import { defineState } from './define-state'
import { arcChase, arcComet, arcGather, arcGears, arcProgress, arcRipple, arcSpin, arcStep, arcTasks, arcUnlock, arcWrite } from './arcs/definition'
import {
  barComet,
  barPing,
  barPlan,
  barRead,
  barSeek,
  barStream,
  barTransfer,
  barTwin,
  barWrite,
} from './bars/definition'
import { circleBreath, squareBreath } from './breath/definition'
import { dotCascade } from './dot-cascade/definition'
import { dotLift } from './dot-lift/definition'
import { dotOrb } from './dot-orb/definition'
import { dotTide } from './dot-tide/definition'
import { dotTwist } from './dot-twist/definition'
import { dotCompact } from './dot-compact/definition'
import { dotRise } from './dot-rise/definition'
import { dotScan } from './dot-scan/definition'
import { dotSwarm } from './dot-swarm/definition'
import { dotSweep } from './dot-sweep/definition'
import { circleFill, squareFill } from './fill/definition'
import { noiseBreathe, noiseConverge, noiseDrift, noiseFlow, noiseFocus, noiseLevel, noiseRipple, noiseScatter, noiseStream, noiseSwirl } from './noise/definition'
import { circlePing } from './ping/definition'
import { circlePulse, squarePulse } from './pulse/definition'
import { squareRead } from './read/definition'
import { squareEdit } from './edit/definition'
import { squareStream } from './stream/definition'
import { squarePlan } from './plan/definition'
import { circleGather } from './gather/definition'
import { circleAwait } from './await/definition'
import { circleRadar } from './radar/definition'
import { circleWave, squareWave } from './wave/definition'
import type { AnimationOption, Shape, StateDefinition, StateInput } from './types'

/** The prop a group switches animations with. */
export const ANIMATION_KEY = 'animation'

interface GroupInput extends Omit<StateInput, 'params' | 'animations' | 'dimension' | 'shape'> {
  /**
   * Each animation, and the single state whose params (and defaults) it takes. The first is the default.
   * `defaults` overrides the shared default for this animation alone, only where the shared one would break
   * the motion (e.g. too many rows moving at once).
   */
  animations: { value: string; label: string; from: StateDefinition; defaults?: Record<string, ParamValue> }[]
  /** The group's own default for props whose single states default differently. Must match the component's. */
  defaults?: Record<string, ParamValue>
}

/**
 * A group: one component for a row, switching between the row's animations through its `animation` prop.
 * A prop has one default across every animation (the group's own, else the first animation's to take it),
 * so switching animation never changes another prop, unless an animation overrides it with its own `defaults`.
 * A value the user set always carries across.
 */
function defineGroup({ animations: input, defaults = {}, ...rest }: GroupInput): StateDefinition {
  const first = input[0].from
  const shared: Record<string, ParamValue> = {}
  for (const { from } of input) for (const p of from.params) shared[p.key] ??= defaults[p.key] ?? p.default
  const withShared = (p: ParamDef, own: Record<string, ParamValue> = {}): ParamDef => {
    const value = own[p.key] ?? shared[p.key]
    // A select whose options don't include the shared default (e.g. a direction of "in" vs "left") keeps its own.
    if (p.kind === 'select' && !p.options.some((o) => o.value === value)) return p
    return { ...p, default: value } as ParamDef
  }
  const animations: AnimationOption[] = input.map(({ value, label, from, defaults: own }) => ({
    value,
    label,
    slug: from.slug,
    params: from.params.map((p) => withShared(p, own)),
  }))
  const group: StateInput = { ...rest, shape: first.shape, dimension: first.dimension, animations, params: [] }
  group.params = paramsFor(group, animations[0].value)
  return defineState(group)
}

function animationParam(animations: AnimationOption[]): ParamDef {
  return {
    kind: 'select',
    key: ANIMATION_KEY,
    label: 'Animation',
    description: 'Which animation runs. Changing it blends from the old animation to the new one; every other prop keeps its value.',
    default: animations[0].value,
    options: animations.map(({ value, label }) => ({ value, label })),
  }
}

/** The params that apply while `animation` runs: for a group, the animation picker plus that animation's own. */
export function paramsFor(state: Pick<StateDefinition, 'params' | 'animations'>, animation: unknown): ParamDef[] {
  const { animations } = state
  if (!animations) return state.params
  const current = animations.find((a) => a.value === animation) ?? animations[0]
  return [animationParam(animations), ...current.params]
}

export const dotGlobe = defineGroup({
  slug: 'dot-globe',
  name: 'Dot Globe',
  summary: 'Every dot-sphere animation in one component; the animation prop switches between them.',
  description:
    'The whole globe row as one component. Pick spin, cascade, lift, tide, twist, scan, rise, sweep, compact or swarm with the animation prop; changing it cross-fades from one animation to the next, and the shared props glide instead of jumping.',
  cardProps: { size: 150 },
  defaults: { duration: 1, gap: 0.4, stagger: 0.1 },
  animations: [
    { value: 'spin', label: 'Spin', from: dotOrb },
    { value: 'cascade', label: 'Cascade', from: dotCascade },
    // The shared 1s / 0.1s would set ~10 rings pushing at once; Dot Lift's own timing keeps it to ~3.5.
    { value: 'lift', label: 'Lift', from: dotLift, defaults: { duration: 0.5, stagger: 0.14 } },
    { value: 'tide', label: 'Tide', from: dotTide },
    { value: 'twist', label: 'Twist', from: dotTwist },
    // At the shared 1s the band passes each row in ~0.1s, too fast to read as reading.
    { value: 'scan', label: 'Scan', from: dotScan, defaults: { duration: 2 } },
    { value: 'rise', label: 'Rise', from: dotRise },
    // At the shared 1s the head passes ~24 columns a second and the trail blurs.
    { value: 'sweep', label: 'Sweep', from: dotSweep, defaults: { duration: 2.4 } },
    // At the shared 1s the waves race to the waist and the hold and release are over in ~0.15s each.
    { value: 'compact', label: 'Compact', from: dotCompact, defaults: { duration: 1.8 } },
    // At the shared 1s each narrow band passes a row in ~0.1s.
    { value: 'swarm', label: 'Swarm', from: dotSwarm, defaults: { duration: 2 } },
  ],
})

export const dotSquare = defineGroup({
  slug: 'dot-square',
  name: 'Dot Square',
  summary: 'Every square-sheet animation in one component; the animation prop switches between them.',
  description:
    'The whole square row as one component. Pick pulse, breath, wave, fill, read, edit, stream or plan with the animation prop; changing it morphs the same dots from one animation into the next.',
  cardProps: { size: 150 },
  animations: [
    { value: 'pulse', label: 'Pulse', from: squarePulse },
    { value: 'breath', label: 'Breath', from: squareBreath },
    { value: 'wave', label: 'Wave', from: squareWave },
    { value: 'fill', label: 'Fill', from: squareFill },
    // At the shared 1.6s the read head races through the sheet faster than anything reads.
    { value: 'read', label: 'Read', from: squareRead, defaults: { duration: 3.5, gap: 0.4 } },
    { value: 'edit', label: 'Edit', from: squareEdit },
    { value: 'stream', label: 'Stream', from: squareStream },
    // At the shared 1.6s a plan's rows tick off too fast to read as items.
    { value: 'plan', label: 'Plan', from: squarePlan, defaults: { duration: 4, gap: 0.6 } },
  ],
})

export const dotCircle = defineGroup({
  slug: 'dot-circle',
  name: 'Dot Circle',
  summary: 'Every circle-sheet animation in one component; the animation prop switches between them.',
  description:
    'The whole circle row as one component. Pick pulse, breath, wave, fill, ping, gather, await or radar with the animation prop; changing it morphs the same dots from one animation into the next.',
  cardProps: { size: 150 },
  animations: [
    { value: 'pulse', label: 'Pulse', from: circlePulse },
    { value: 'breath', label: 'Breath', from: circleBreath },
    { value: 'wave', label: 'Wave', from: circleWave },
    { value: 'fill', label: 'Fill', from: circleFill },
    // At the shared 1.6s a leg, a ping takes over 4s to come back and stops reading as one round trip.
    { value: 'ping', label: 'Ping', from: circlePing, defaults: { duration: 0.9, gap: 0.5, ringWidth: 0.3 } },
    // At the shared 1.6s the gather drags.
    { value: 'gather', label: 'Gather', from: circleGather, defaults: { duration: 1.1, gap: 0.4 } },
    // At the shared 1.6s / 0.3s the heartbeat races; waiting should feel calm.
    { value: 'await', label: 'Await', from: circleAwait, defaults: { duration: 2.4, gap: 0.6 } },
    // At the shared 1.6s the sweep spins faster than it searches.
    { value: 'radar', label: 'Radar', from: circleRadar, defaults: { duration: 2 } },
  ],
})

export const barRing = defineGroup({
  slug: 'bar-ring',
  name: 'Bar Ring',
  summary: 'Every bar-ring animation in one component; the animation prop switches between them.',
  description:
    'The whole bars row as one component. Pick an animation for each AI state (read, comet, twin, write, seek, stream, transfer, ping or plan) with the animation prop, and outward or inward with direction; changing either glides the same bars from one motion into the next.',
  cardProps: { size: 150 },
  // Read is the default; the waves below that want brisker timing set their own.
  defaults: { duration: 0.32, stagger: 0.09 },
  animations: [
    { value: 'read', label: 'Read', from: barRead },
    // The shared 0.24s pushes only ~4 bars, too short to read as a tail.
    { value: 'comet', label: 'Comet', from: barComet, defaults: { duration: 0.5, stagger: 0.05 } },
    { value: 'twin', label: 'Twin', from: barTwin, defaults: { duration: 0.24, stagger: 0.06 } },
    // The shared 0.06s keystrokes make a write take over 4s.
    { value: 'write', label: 'Write', from: barWrite, defaults: { duration: 0.2, stagger: 0.05 } },
    { value: 'seek', label: 'Seek', from: barSeek, defaults: { duration: 0.24, stagger: 0.06 } },
    // At the shared timing each pulse covers four bars, so the gaps between tokens close up.
    { value: 'stream', label: 'Stream', from: barStream, defaults: { duration: 0.08, stagger: 0.03 } },
    // The shared 0.06s stagger makes one looping fill take over 2s.
    { value: 'transfer', label: 'Transfer', from: barTransfer, defaults: { duration: 0.16, stagger: 0.04 } },
    // The shared stagger makes each leg of the trip over a second.
    { value: 'ping', label: 'Ping', from: barPing, defaults: { duration: 0.2, stagger: 0.04 } },
    { value: 'plan', label: 'Plan', from: barPlan, defaults: { duration: 0.24, stagger: 0.06 } },
  ],
})

export const noiseRings = defineGroup({
  slug: 'noise-rings',
  name: 'Noise Rings',
  summary: 'Every noise-ring animation in one component; the animation prop switches between them.',
  description:
    'The whole noise rings row as one component. Pick drift, ripple, breathe, swirl, converge, level, flow, stream, focus or scatter with the animation prop; changing it morphs the same rings from one motion into the next.',
  cardProps: { size: 150 },
  defaults: { speed: 0.35 },
  animations: [
    { value: 'drift', label: 'Drift', from: noiseDrift, defaults: { speed: 0.7 } },
    { value: 'ripple', label: 'Ripple', from: noiseRipple },
    { value: 'breathe', label: 'Breathe', from: noiseBreathe },
    { value: 'swirl', label: 'Swirl', from: noiseSwirl },
    { value: 'converge', label: 'Converge', from: noiseConverge },
    { value: 'level', label: 'Level', from: noiseLevel, defaults: { speed: 0.7 } },
    { value: 'flow', label: 'Flow', from: noiseFlow },
    { value: 'stream', label: 'Stream', from: noiseStream },
    { value: 'focus', label: 'Focus', from: noiseFocus },
    { value: 'scatter', label: 'Scatter', from: noiseScatter },
  ],
})

export const arcRings = defineGroup({
  slug: 'arc-rings',
  name: 'Arc Rings',
  summary: 'Every arc-ring animation in one component; the animation prop switches between them.',
  description:
    'The whole arcs row as one component. Pick spin, chase, step, gather, ripple, gears, comet, unlock, write, tasks or progress with the animation prop; changing it morphs the same arcs from one motion into the next.',
  cardProps: { size: 150 },
  animations: [
    { value: 'spin', label: 'Spin', from: arcSpin },
    { value: 'chase', label: 'Chase', from: arcChase },
    { value: 'step', label: 'Step', from: arcStep },
    { value: 'gather', label: 'Gather', from: arcGather },
    { value: 'ripple', label: 'Ripple', from: arcRipple },
    { value: 'gears', label: 'Gears', from: arcGears },
    { value: 'comet', label: 'Comet', from: arcComet },
    { value: 'unlock', label: 'Unlock', from: arcUnlock },
    { value: 'write', label: 'Write', from: arcWrite },
    { value: 'tasks', label: 'Tasks', from: arcTasks },
    { value: 'progress', label: 'Progress', from: arcProgress },
  ],
})

export const groups: StateDefinition[] = [dotGlobe, dotSquare, dotCircle, noiseRings, arcRings, barRing]

/** The group that stands for a home row, if the row has one. */
export function groupFor(shape: Shape): StateDefinition | undefined {
  return groups.find((g) => g.shape === shape)
}

/**
 * For a single state in a grouped row: the row's group, and the group animation that runs it.
 * The playground shows grouped animations on the group, so switching animation stays on one component.
 */
export function groupedAs(state: StateDefinition): { group: StateDefinition; animation: string } | undefined {
  if (state.animations) return undefined
  const group = groupFor(state.shape)
  const option = group?.animations?.find((a) => a.slug === state.slug)
  return group && option ? { group, animation: option.value } : undefined
}
