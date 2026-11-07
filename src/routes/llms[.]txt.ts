import { createFileRoute } from '@tanstack/react-router'
import { llmsTxt } from '#/features/ai/llms'

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () => new Response(llmsTxt(), { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
    },
  },
})
