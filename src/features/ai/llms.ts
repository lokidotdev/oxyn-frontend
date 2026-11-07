import { components, groups, paramsFor, states, useCaseFor } from '#/features/states'
import type { StateDefinition } from '#/features/states'
import { usageSnippet } from '#/features/playground/usage'
import { defaultValues } from '#/shared/lib/params'
import { SITE_NAME, SITE_TAGLINE, absoluteUrl, installCommand } from '#/shared/lib/site'

const INTRO = `${SITE_NAME} is a set of ${components.length} animated React loaders (${states.length} single states and ${groups.length} group components), each drawn on a canvas and shipped as one self-contained file installed with the shadcn CLI. Instead of one spinner for every wait, each loader stands for one AI agent state: reading a file, editing, searching, calling a tool, uploading, waiting on approval.

- React only. Each file imports only from \`react\` and starts with "use client".
- Accessible: renders role="status" with a \`label\` prop, and holds still under prefers-reduced-motion.
- Each row also ships as one group component whose \`animation\` prop morphs between the row's states.
- MIT licensed. Not for determinate progress bars, skeletons, or Vue/Svelte/HTML.`

const line = (s: StateDefinition) => `- [${s.name}](${absoluteUrl(`/components/${s.slug}`)}): ${useCaseFor(s)}. ${s.summary}`

/** The llms.txt index: what oxyn is, and one line per component. */
export function llmsTxt() {
  return `# ${SITE_NAME}

> ${SITE_TAGLINE}: reading, editing, searching, calling a tool, uploading. Not just "loading".

${INTRO}

Install any loader with \`${installCommand('<slug>')}\`. The full registry index is at ${absoluteUrl('/r/registry.json')}. AI assistants can also query ${absoluteUrl('/mcp')}, an MCP server with search_loaders and get_loader tools.

## Group components

${groups.map(line).join('\n')}

## Loaders

${states.map(line).join('\n')}

## Optional

- [Full reference](${absoluteUrl('/llms-full.txt')}): every component's install command, usage and props.
`
}

/** One component as Markdown: what it's for, how to install and use it, and its props. */
export function componentMarkdown(s: StateDefinition) {
  const schema = paramsFor(s, undefined)
  const props = schema.map((p) => `| \`${p.key}\` | ${typeof p.default === 'string' ? `"${p.default}"` : String(p.default)} | ${p.description} |`)
  const animations = s.animations ? `\nAnimations (\`animation\` prop): ${s.animations.map((a) => `\`${a.value}\``).join(', ')}.\n` : ''
  return `## ${s.name}

${s.description}

- Use for: ${useCaseFor(s)}
- Page: ${absoluteUrl(`/components/${s.slug}`)}
- Install: \`${installCommand(s.slug)}\`
${animations}
\`\`\`tsx
${usageSnippet(s, schema, defaultValues(schema))}
\`\`\`

| Prop | Default | Description |
| --- | --- | --- |
${props.join('\n')}
| \`label\` | "Thinking" | Accessible name; the wrapper is role="status". |
`
}

export function llmsFullTxt() {
  return `# ${SITE_NAME}: full reference

${INTRO}

${components.map(componentMarkdown).join('\n')}`
}
