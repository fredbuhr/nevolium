import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nevolium/graph': fileURLToPath(new URL('../../packages/graph/src/index.ts', import.meta.url)),
    },
  },
})
