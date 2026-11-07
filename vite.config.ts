import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { standaloneRegistry } from './scripts/registry/vite-plugin.ts'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    standaloneRegistry(),
    tailwindcss(),
    // Inlines the stylesheet into the SSR HTML so it isn't a render-blocking request.
    tanstackStart({ server: { build: { inlineCss: true } } }),
    viteReact(),
  ],
})

export default config
