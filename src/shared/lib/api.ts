// The backend holds site content only (SEO, banners), so every read degrades to a
// fallback: the site renders from the registry alone when the API is down or not configured.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(new URL(`/api/v1${path}`, API_URL), { signal: AbortSignal.timeout(3000) })
    return res.ok ? ((await res.json()) as T) : fallback
  } catch {
    return fallback
  }
}
