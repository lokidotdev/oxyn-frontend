import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { standaloneRegistry } from './scripts/registry/vite-plugin.ts'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), standaloneRegistry(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
