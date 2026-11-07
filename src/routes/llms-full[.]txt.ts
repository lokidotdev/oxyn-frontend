import { createFileRoute } from '@tanstack/react-router'
import { llmsFullTxt } from '#/features/ai/llms'

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: () => new Response(llmsFullTxt(), { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
    },
  },
})
