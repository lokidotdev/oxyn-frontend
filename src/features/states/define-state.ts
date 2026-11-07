import type { ComponentType } from 'react'
import type { StateDefinition, StateInput } from './types'

// Every component in src/registry as live code. The single file a user copies or installs is loaded on demand,
// one chunk per component, so the catalog doesn't ship every component's source.
const modules = import.meta.glob<Record<string, unknown>>(['../../registry/*/*.tsx', '!../../registry/lib/**'], { eager: true })
const sources = import.meta.glob<string>(['../../registry/*/*.tsx', '!../../registry/lib/**'], {
  query: '?standalone',
  import: 'default',
})

export interface RegistryEntry {
  componentName: string
  fileName: string
  Component: ComponentType<any>
  /** Loads the shippable single file, with the lib code it uses inlined. */
  loadSource: () => Promise<string>
}

/** Finds `src/registry/<slug>/<slug>.tsx` and its exported component, named after the slug in PascalCase. */
function registryEntry(slug: string): RegistryEntry {
  const path = `../../registry/${slug}/${slug}.tsx`
  const componentName = slug.replace(/(^|-)(\w)/g, (_, _dash, c: string) => c.toUpperCase())
  const Component = modules[path]?.[componentName]
  if (typeof Component !== 'function') throw new Error(`src/registry/${slug}/${slug}.tsx must export ${componentName}`)
  return { componentName, fileName: `${slug}.tsx`, Component: Component as ComponentType<any>, loadSource: sources[path] }
}

/** A state in the catalog. Its component, file name and shippable source all follow from the slug. */
export function defineState(input: StateInput): StateDefinition {
  return { ...input, ...registryEntry(input.slug) }
}
