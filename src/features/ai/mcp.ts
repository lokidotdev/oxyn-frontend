import { components, getState, useCaseFor } from '#/features/states'
import type { StateDefinition } from '#/features/states'
import { absoluteUrl, installCommand } from '#/shared/lib/site'
import { componentMarkdown } from './llms'

/**
 * A stateless MCP server (Streamable HTTP, JSON responses only), so an assistant can pick and install a loader
 * by what its agent is doing. Two read-only tools over the registry; no sessions, no streaming.
 */

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

const TOOLS = [
  {
    name: 'search_loaders',
    title: 'Search loaders',
    description:
      'Find oxyn React loaders for an AI agent state, e.g. "reading a file", "parallel tool calls", "waiting for approval", "voice input". Leave query empty to list all of them.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What the agent is doing, or a loader name.' } },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_loader',
    title: 'Get loader',
    description: "One loader's install command, usage snippet and props, by its slug (e.g. bar-read).",
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'The loader slug from search_loaders.' } },
      required: ['slug'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
]

type JsonRpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, any> }

// Words of three letters or more, so "a" or "on" never prefix-match a query term.
const words = (text: string) => (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2)

/** Loaders ranked by how many query words their use case, name and summary share; the use case counts most. */
export function searchLoaders(query = '') {
  const terms = words(query).filter((w) => !['the', 'and', 'for', 'agent', 'loader'].includes(w))
  if (terms.length === 0) return components
  const score = (s: StateDefinition) => {
    const use = words(useCaseFor(s))
    const rest = words(`${s.slug} ${s.name} ${s.summary}`)
    return terms.reduce((n, t) => n + (use.some((w) => w.startsWith(t) || t.startsWith(w)) ? 3 : 0) + (rest.some((w) => w.startsWith(t)) ? 1 : 0), 0)
  }
  return components
    .map((s) => ({ s, n: score(s) }))
    .filter(({ n }) => n > 0)
    .sort((a, b) => b.n - a.n)
    .map(({ s }) => s)
}

function callTool(name: string, args: Record<string, unknown>) {
  if (name === 'search_loaders') {
    const found = searchLoaders(typeof args.query === 'string' ? args.query : '')
    const text = found.length
      ? found.map((s) => `- ${s.slug} (${s.name}): ${useCaseFor(s)}. ${s.summary}\n  ${installCommand(s.slug)}`).join('\n')
      : 'No loader matches. Call search_loaders with an empty query to list all of them.'
    return { content: [{ type: 'text', text }] }
  }
  if (name === 'get_loader') {
    const state = typeof args.slug === 'string' ? getState(args.slug) : undefined
    if (!state) return { content: [{ type: 'text', text: `Unknown slug. Find one with search_loaders.` }], isError: true }
    return { content: [{ type: 'text', text: componentMarkdown(state) }] }
  }
  return undefined
}

function handle(req: JsonRpcRequest) {
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: req.id, result })
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: req.id ?? null, error: { code, message } })

  switch (req.method) {
    case 'initialize': {
      const asked = req.params?.protocolVersion
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'oxyn', title: 'oxyn loaders', version: '0.1.0', websiteUrl: absoluteUrl('/') },
        instructions: 'Pick an animated React loader for what an AI agent is doing, then install it with the shadcn CLI.',
      })
    }
    case 'ping':
      return ok({})
    case 'tools/list':
      return ok({ tools: TOOLS })
    case 'tools/call': {
      const result = callTool(req.params?.name, req.params?.arguments ?? {})
      return result ? ok(result) : fail(-32602, `Unknown tool: ${req.params?.name}`)
    }
    default:
      return fail(-32601, `Method not found: ${req.method}`)
  }
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id',
}

export async function mcpResponse(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  // No server-initiated stream: GET is how a client asks for one, so say it isn't offered.
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, allow: 'POST' } })

  let body: JsonRpcRequest | JsonRpcRequest[]
  try {
    body = await request.json()
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: CORS })
  }
  const batch = Array.isArray(body) ? body : [body]
  // Notifications (no id) get no reply.
  const replies = batch.filter((r) => r.id !== undefined && r.id !== null).map(handle)
  if (replies.length === 0) return new Response(null, { status: 202, headers: CORS })
  return Response.json(Array.isArray(body) ? replies : replies[0], { headers: CORS })
}
