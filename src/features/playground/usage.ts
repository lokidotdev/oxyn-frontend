import type { StateDefinition } from '#/features/states'
import { changedValues } from '#/shared/lib/params'
import type { ParamValue, ParamValues } from '#/shared/lib/params'

function formatProp(key: string, value: ParamValue): string {
  if (typeof value === 'string') return `${key}="${value}"`
  if (value === true) return key
  return `${key}={${value}}`
}

export function importPath(state: StateDefinition) {
  return `@/components/${state.fileName.replace(/\.tsx$/, '')}`
}

export function usageSnippet(state: StateDefinition, values: ParamValues): string {
  const props = Object.entries(changedValues(state.params, values)).map(([k, v]) => formatProp(k, v))
  const tag =
    props.length === 0
      ? `<${state.componentName} />`
      : props.length <= 2
        ? `<${state.componentName} ${props.join(' ')} />`
        : `<${state.componentName}\n      ${props.join('\n      ')}\n    />`

  return `import { ${state.componentName} } from "${importPath(state)}";

export function Thinking() {
  return (
    ${tag}
  );
}`
}
