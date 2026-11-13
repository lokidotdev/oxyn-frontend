// The bindings src/server.ts reads. Run `pnpm cf-typegen` for the full generated types.
declare module 'cloudflare:workers' {
  export const env: {
    ASSETS?: { fetch(request: Request): Promise<Response> }
    /** Shared with the backend so only this Worker can record installs. */
    INSTALLS_TOKEN?: string
  }
  export function waitUntil(promise: Promise<unknown>): void
}
