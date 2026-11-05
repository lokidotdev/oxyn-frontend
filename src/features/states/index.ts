import { arcRings } from './arc-rings/definition'
import { circleBreath, squareBreath } from './breath/definition'
import { dotCascade } from './dot-cascade/definition'
import { dotLift } from './dot-lift/definition'
import { dotOrb } from './dot-orb/definition'
import { dotTide } from './dot-tide/definition'
import { noiseRings } from './noise-rings/definition'
import { circlePulse, squarePulse } from './pulse/definition'
import { circleWave, squareWave } from './wave/definition'
import { groups } from './groups'
import type { StateDefinition } from './types'

export type { AnimationOption, Dimension, Shape, StateDefinition } from './types'
export { ANIMATION_KEY, groupFor, groups, paramsFor } from './groups'

export const states: StateDefinition[] = [
  dotOrb,
  dotCascade,
  dotLift,
  dotTide,
  squarePulse,
  squareBreath,
  squareWave,
  circlePulse,
  circleBreath,
  circleWave,
  noiseRings,
  arcRings,
]

/** Every component that ships: each single state, then each group. */
export const components: StateDefinition[] = [...states, ...groups]

export function getState(slug: string): StateDefinition | undefined {
  return components.find((s) => s.slug === slug)
}
