import type { ParamDef } from '#/shared/lib/params'
import type { RegistryEntry } from './define-state'

export type Dimension = '2.5D' | '2D'

export type Shape = 'globe' | 'square' | 'circle' | 'rings' | 'arcs'

export interface StateDefinition extends RegistryEntry {
  slug: string
  /** Flat sheet (2D) or flat canvas faking depth (2.5D). Drives the home filter. */
  dimension: Dimension
  /** Silhouette of the loader. Groups the home grid into one row per shape. */
  shape: Shape
  name: string
  /** One line for the shadcn registry. */
  summary: string
  description: string
  params: ParamDef[]
  /** Props passed to the live card on the home grid. */
  cardProps?: Record<string, unknown>
}

/** What a definition declares; the rest is found from the slug. */
export type StateInput = Omit<StateDefinition, keyof RegistryEntry>
