import { arcRings } from './arc-rings/definition'
import { circleBreath, squareBreath } from './breath/definition'
import { dotCascade } from './dot-cascade/definition'
import { dotLift } from './dot-lift/definition'
import { dotOrb } from './dot-orb/definition'
import { dotTide } from './dot-tide/definition'
import { noiseRings } from './noise-rings/definition'
import { circlePulse, squarePulse } from './pulse/definition'
import { circleWave, squareWave } from './wave/definition'
import type { StateDefinition } from './types'

export type { Dimension, Shape, StateDefinition } from './types'

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

export function getState(slug: string): StateDefinition | undefined {
  return states.find((s) => s.slug === slug)
}
