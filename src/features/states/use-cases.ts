import { groupedAs } from './groups'
import type { StateDefinition } from './types'

/**
 * The agent state each loader stands for, in a few words. Shown on the component page and read by
 * llms.txt and the MCP server, so an assistant can pick a loader by what the agent is doing.
 */
const USE_CASES: Record<string, string> = {
  'dot-think': 'Thinking',
  'dot-ponder': 'Thinking',
  'dot-process': 'Processing',
  'dot-work': 'Working on a task',
  'dot-reason': 'Reasoning through a problem',
  'dot-read': 'Reading a file',
  'dot-transfer': 'Uploading or downloading',
  'dot-search': 'Searching',
  'dot-compact': 'Compacting or summarizing context',
  'dot-parallel': 'Parallel tool calls and subagents',
  'square-think': 'Thinking',
  'square-idle': 'Idle or waiting',
  'square-process': 'Processing',
  'square-load': 'Loading',
  'square-read': 'Reading a file',
  'square-edit': 'Editing a file',
  'square-stream': 'Running a command, streaming output',
  'square-plan': 'Working through a plan',
  'circle-think': 'Thinking',
  'circle-idle': 'Idle or waiting',
  'circle-process': 'Processing',
  'circle-load': 'Loading',
  'circle-ping': 'API call, tool call or MCP request',
  'circle-upload': 'Uploading',
  'circle-await': 'Waiting on user approval',
  'circle-search': 'Searching the web',
  'noise-think': 'Thinking',
  'noise-respond': 'Responding',
  'noise-listen': 'Idle or listening',
  'noise-ponder': 'Thinking',
  'noise-decide': 'Settling on an answer',
  'noise-voice': 'Voice or audio input',
  'noise-transfer': 'Uploading or downloading',
  'noise-stream': 'Streaming an answer',
  'noise-analyze': 'Deep reading or analysis',
  'noise-search': 'Broad search',
  'arc-load': 'Loading',
  'arc-work': 'Working on a task',
  'arc-plan': 'Step-by-step progress',
  'arc-assemble': 'Assembling a result',
  'arc-process': 'Processing',
  'arc-run': 'Running a task',
  'arc-think': 'Thinking',
  'arc-search': 'Searching or matching',
  'arc-write': 'Writing or editing a file',
  'arc-parallel': 'Parallel tool calls and subagents',
  'arc-transfer': 'Upload or download progress',
  'bar-think': 'Thinking or running a tool',
  'bar-parallel': 'Parallel tool calls and subagents',
  'bar-read': 'Reading a file',
  'bar-write': 'Editing or writing a file',
  'bar-search': 'Searching (grep, web)',
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
