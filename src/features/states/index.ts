import { arcWork, arcThink, arcAssemble, arcRun, arcTransfer, arcProcess, arcLoad, arcPlan, arcParallel, arcSearch, arcWrite } from './arcs/definition'
import {
  barThink,
  barPing,
  barPlan,
  barRead,
  barSearch,
  barStream,
  barTransfer,
  barParallel,
  barWrite,
} from './bars/definition'
import { circleIdle, squareIdle } from './idle/definition'
import { dotPonder } from './dot-ponder/definition'
import { dotProcess } from './dot-process/definition'
import { dotThink } from './dot-think/definition'
import { dotWork } from './dot-work/definition'
import { dotReason } from './dot-reason/definition'
import { dotCompact } from './dot-compact/definition'
import { dotTransfer } from './dot-transfer/definition'
import { dotRead } from './dot-read/definition'
import { dotParallel } from './dot-parallel/definition'
import { dotSearch } from './dot-search/definition'
import { circleLoad, squareLoad } from './load/definition'
import { noiseListen, noiseDecide, noiseThink, noiseTransfer, noiseAnalyze, noiseVoice, noiseRespond, noiseSearch, noiseStream, noisePonder } from './noise/definition'
import { circlePing } from './ping/definition'
import { circleThink, squareThink } from './think/definition'
import { squareRead } from './read/definition'
import { squareEdit } from './edit/definition'
import { squareStream } from './stream/definition'
import { squarePlan } from './plan/definition'
import { circleUpload } from './upload/definition'
import { circleAwait } from './await/definition'
import { circleSearch } from './search/definition'
import { circleProcess, squareProcess } from './process/definition'
import { groups } from './groups'
import type { StateDefinition } from './types'

export type { AnimationOption, Dimension, Shape, StateDefinition } from './types'
export { ANIMATION_KEY, groupFor, groups, groupedAs, paramsFor } from './groups'
export { relatedTo, useCaseFor } from './use-cases'

export const states: StateDefinition[] = [
  dotThink,
  dotPonder,
  dotProcess,
  dotWork,
  dotReason,
  dotRead,
  dotTransfer,
  dotSearch,
  dotCompact,
  dotParallel,
  squareThink,
  squareIdle,
  squareProcess,
  squareLoad,
  squareRead,
  squareEdit,
  squareStream,
  squarePlan,
  circleThink,
  circleIdle,
  circleProcess,
  circleLoad,
  circlePing,
  circleUpload,
  circleAwait,
  circleSearch,
  noiseThink,
  noiseRespond,
  noiseListen,
  noisePonder,
  noiseDecide,
  noiseVoice,
  noiseTransfer,
  noiseStream,
  noiseAnalyze,
  noiseSearch,
  arcLoad,
  arcWork,
  arcPlan,
  arcAssemble,
  arcProcess,
  arcRun,
  arcThink,
  arcSearch,
  arcWrite,
  arcParallel,
  arcTransfer,
  barThink,
  barParallel,
  barRead,
  barWrite,
  barSearch,
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
