import { groupedAs } from './groups'
import type { StateDefinition } from './types'

/**
 * The agent state each loader stands for, in a few words. Shown on the component page and read by
 * llms.txt and the MCP server, so an assistant can pick a loader by what the agent is doing.
 */
const USE_CASES: Record<string, string> = {
  'dot-orb': 'Thinking',
  'dot-cascade': 'Thinking',
  'dot-lift': 'Processing',
  'dot-tide': 'Working on a task',
  'dot-twist': 'Reasoning through a problem',
  'dot-scan': 'Reading a file',
  'dot-rise': 'Uploading or downloading',
  'dot-sweep': 'Searching',
  'dot-compact': 'Compacting or summarizing context',
  'dot-swarm': 'Parallel tool calls and subagents',
  'square-pulse': 'Thinking',
  'square-breath': 'Idle or waiting',
  'square-wave': 'Processing',
  'square-fill': 'Loading',
  'square-read': 'Reading a file',
  'square-edit': 'Editing a file',
  'square-stream': 'Running a command, streaming output',
  'square-plan': 'Working through a plan',
  'circle-pulse': 'Thinking',
  'circle-breath': 'Idle or waiting',
  'circle-wave': 'Processing',
  'circle-fill': 'Loading',
  'circle-ping': 'API call, tool call or MCP request',
  'circle-gather': 'Uploading',
  'circle-await': 'Waiting on user approval',
  'circle-radar': 'Searching the web',
  'noise-drift': 'Thinking',
  'noise-ripple': 'Responding',
  'noise-breathe': 'Idle or listening',
  'noise-swirl': 'Thinking',
  'noise-converge': 'Settling on an answer',
  'noise-level': 'Voice or audio input',
  'noise-flow': 'Uploading or downloading',
  'noise-stream': 'Streaming an answer',
  'noise-focus': 'Deep reading or analysis',
  'noise-scatter': 'Broad search',
  'arc-spin': 'Loading',
  'arc-chase': 'Working on a task',
  'arc-step': 'Step-by-step progress',
  'arc-gather': 'Assembling a result',
  'arc-ripple': 'Processing',
  'arc-gears': 'Running a task',
  'arc-comet': 'Thinking',
  'arc-unlock': 'Searching or matching',
  'arc-write': 'Writing or editing a file',
  'arc-tasks': 'Parallel tool calls and subagents',
  'arc-progress': 'Upload or download progress',
  'bar-comet': 'Thinking or running a tool',
  'bar-twin': 'Parallel tool calls and subagents',
  'bar-read': 'Reading a file',
  'bar-write': 'Editing or writing a file',
  'bar-seek': 'Searching (grep, web)',
  'bar-stream': 'Running a command, streaming output',
  'bar-transfer': 'Uploading or downloading',
  'bar-ping': 'API call or MCP request',
  'bar-plan': 'Working through a plan',
}

/** What the loader is for. A group stands for every state its animations cover. */
export function useCaseFor(state: StateDefinition): string {
  if (state.animations) return 'Switching between agent states with one component'
  return USE_CASES[state.slug] ?? 'Loading'
}

/** Other loaders worth a look from this one's page: its row's siblings, then same-state loaders from other rows. */
export function relatedTo(state: StateDefinition, all: StateDefinition[]) {
  const byShape = all.filter((s) => !s.animations && s.shape === state.shape && s.slug !== state.slug)
  if (state.animations) return { group: undefined, siblings: byShape, sameUse: [] }
  const use = USE_CASES[state.slug]
  const sameUse = all.filter((s) => !s.animations && s.shape !== state.shape && USE_CASES[s.slug] === use)
  return { group: groupedAs(state)?.group, siblings: byShape, sameUse }
}
