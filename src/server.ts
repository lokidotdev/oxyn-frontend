import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { env, waitUntil } from 'cloudflare:workers'

// Installs are counted here: `npx shadcn add <site>/r/<slug>.json` fetches a static file, so
// wrangler.jsonc routes /r/* through this Worker (run_worker_first) instead of straight to the asset.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
const ITEM = /^\/r\/([a-z0-9][a-z0-9-]*)\.json$/

// The CLI fetches with Node; browsers and most crawlers announce themselves as Mozilla.
const isCli = (request: Request) => !(request.headers.get('user-agent') ?? '').startsWith('Mozilla/')

// Lets the backend count repeat fetches by one client as one install. Only this hash leaves the Worker, never the IP.
async function visitorKey(request: Request) {
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'local'
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${request.headers.get('user-agent') ?? ''}`))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function recordInstall(request: Request, slug: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (env.INSTALLS_TOKEN) headers['x-installs-token'] = env.INSTALLS_TOKEN
  // Counting never delays or breaks the install.
  waitUntil(
    visitorKey(request)
      .then((visitor) => fetch(new URL(`/api/v1/installs/${slug}`, API_URL), { method: 'POST', headers, body: JSON.stringify({ visitor }) }))
      .catch(() => {}),
  )
}

export default createServerEntry({
  async fetch(request) {
    const slug = new URL(request.url).pathname.match(ITEM)?.[1]
    if (slug && env.ASSETS) {
      const res = await env.ASSETS.fetch(request)
      if (res.ok && request.method === 'GET' && slug !== 'registry' && isCli(request)) recordInstall(request, slug)
      return res
    }
    return handler.fetch(request)
  },
})
