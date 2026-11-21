// The backend holds site content only (SEO, banners), so every read degrades to a
// fallback: the site renders from the registry alone when the API is down or not configured.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8790'

export async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(new URL(`/api/v1${path}`, API_URL), { signal: AbortSignal.timeout(3000) })
    return res.ok ? ((await res.json()) as T) : fallback
  } catch {
    return fallback
  }
}

/** POSTs JSON. Unlike getJson this one reports failure: `{ error }` from the API's body, or a generic message. */
export async function postJson<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(new URL(`/api/v1${path}`, API_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null
    if (res.ok && json) return { ok: true, data: json }
    return { ok: false, error: json?.error ?? `Something went wrong (${res.status}).` }
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." }
  }
}
