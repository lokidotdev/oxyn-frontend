import type { ParamDef } from '#/shared/lib/params'
import { defineState } from './define-state'
import { circleBreath, squareBreath } from './breath/definition'
import { dotCascade } from './dot-cascade/definition'
import { dotLift } from './dot-lift/definition'
import { dotOrb } from './dot-orb/definition'
import { dotTide } from './dot-tide/definition'
import { circlePulse, squarePulse } from './pulse/definition'
import { circleWave, squareWave } from './wave/definition'
import type { AnimationOption, Shape, StateDefinition, StateInput } from './types'

/** The prop a group switches animations with. */
export const ANIMATION_KEY = 'animation'

interface GroupInput extends Omit<StateInput, 'params' | 'animations' | 'dimension' | 'shape'> {
  /** Each animation, and the single state whose params (and defaults) it takes. The first is the default. */
  animations: { value: string; label: string; from: StateDefinition }[]
}

/** A group: one component for a row, switching between the row's animations through its `animation` prop. */
function defineGroup({ animations: input, ...rest }: GroupInput): StateDefinition {
  const first = input[0].from
  const animations: AnimationOption[] = input.map(({ value, label, from }) => ({ value, label, params: from.params }))
  const group: StateInput = { ...rest, shape: first.shape, dimension: first.dimension, animations, params: [] }
  group.params = paramsFor(group, animations[0].value)
  return defineState(group)
}

function animationParam(animations: AnimationOption[]): ParamDef {
  return {
    kind: 'select',
    key: ANIMATION_KEY,
    label: 'Animation',
    description: 'Which animation runs. Changing it blends from the old animation to the new one, and the other props default to that animation’s own values.',
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
    'The whole globe row as one component. Pick spin, cascade, lift or tide with the animation prop; changing it cross-fades from one animation to the next, and the shared props glide instead of jumping.',
  cardProps: { size: 150 },
  animations: [
    { value: 'spin', label: 'Spin', from: dotOrb },
    { value: 'cascade', label: 'Cascade', from: dotCascade },
    { value: 'lift', label: 'Lift', from: dotLift },
    { value: 'tide', label: 'Tide', from: dotTide },
  ],
})

export const dotSquare = defineGroup({
  slug: 'dot-square',
  name: 'Dot Square',
  summary: 'Every square-sheet animation in one component; the animation prop switches between them.',
  description:
    'The whole square row as one component. Pick pulse, breath or wave with the animation prop; changing it morphs the same dots from one animation into the next.',
  cardProps: { size: 150 },
  animations: [
    { value: 'pulse', label: 'Pulse', from: squarePulse },
    { value: 'breath', label: 'Breath', from: squareBreath },
    { value: 'wave', label: 'Wave', from: squareWave },
  ],
})

export const dotCircle = defineGroup({
  slug: 'dot-circle',
  name: 'Dot Circle',
  summary: 'Every circle-sheet animation in one component; the animation prop switches between them.',
  description:
    'The whole circle row as one component. Pick pulse, breath or wave with the animation prop; changing it morphs the same dots from one animation into the next.',
  cardProps: { size: 150 },
  animations: [
    { value: 'pulse', label: 'Pulse', from: circlePulse },
    { value: 'breath', label: 'Breath', from: circleBreath },
    { value: 'wave', label: 'Wave', from: circleWave },
  ],
})

export const groups: StateDefinition[] = [dotGlobe, dotSquare, dotCircle]

/** The group that stands for a home row, if the row has one. */
export function groupFor(shape: Shape): StateDefinition | undefined {
  return groups.find((g) => g.shape === shape)
}
