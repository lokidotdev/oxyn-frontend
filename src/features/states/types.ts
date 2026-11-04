import type { ComponentType } from 'react'
import type { ParamDef } from '#/shared/lib/params'

export type Dimension = '2.5D' | '2D'

export type Shape = 'globe' | 'square' | 'circle' | 'rings' | 'arcs'

export interface StateDefinition {
  slug: string
  /** Flat sheet (2D) or flat canvas faking depth (2.5D). Drives the home filter. */
  dimension: Dimension
  /** Silhouette of the loader. Groups the home grid into one row per shape. */
  shape: Shape
  name: string
  description: string
  /** Exported component name, used in the usage snippet. */
  componentName: string
  /** File name the user ends up with after copying / installing. */
  fileName: string
  Component: ComponentType<any>
  params: ParamDef[]
  /** Raw source of the shippable registry file. */
  source: string
  /** Props passed to the live card on the home grid. */
  cardProps?: Record<string, unknown>
}
