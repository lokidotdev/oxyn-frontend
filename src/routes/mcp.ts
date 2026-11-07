import { createFileRoute } from '@tanstack/react-router'
import { mcpResponse } from '#/features/ai/mcp'

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      POST: ({ request }) => mcpResponse(request),
      GET: ({ request }) => mcpResponse(request),
      OPTIONS: ({ request }) => mcpResponse(request),
    },
  },
})
