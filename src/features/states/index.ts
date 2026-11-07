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
import { groups } from './groups'
import type { StateDefinition } from './types'

export type { AnimationOption, Dimension, Shape, StateDefinition } from './types'
export { ANIMATION_KEY, groupFor, groups, groupedAs, paramsFor } from './groups'
export { relatedTo, useCaseFor } from './use-cases'

export const states: StateDefinition[] = [
  dotOrb,
  dotCascade,
  dotLift,
  dotTide,
  dotTwist,
  dotScan,
  dotRise,
  dotSweep,
  dotCompact,
  dotSwarm,
  squarePulse,
  squareBreath,
  squareWave,
  squareFill,
  squareRead,
  squareEdit,
  squareStream,
  squarePlan,
  circlePulse,
  circleBreath,
  circleWave,
  circleFill,
  circlePing,
  circleGather,
  circleAwait,
  circleRadar,
  noiseDrift,
  noiseRipple,
  noiseBreathe,
  noiseSwirl,
  noiseConverge,
  noiseLevel,
  noiseFlow,
  noiseStream,
  noiseFocus,
  noiseScatter,
  arcSpin,
  arcChase,
  arcStep,
  arcGather,
  arcRipple,
  arcGears,
  arcComet,
  arcUnlock,
  arcWrite,
  arcTasks,
  arcProgress,
  barComet,
  barTwin,
  barRead,
  barWrite,
  barSeek,
  barStream,
  barTransfer,
  barPing,
  barPlan,
]

/** Every component that ships: each single state, then each group. */
export const components: StateDefinition[] = [...states, ...groups]

export function getState(slug: string): StateDefinition | undefined {
  return components.find((s) => s.slug === slug)
}
