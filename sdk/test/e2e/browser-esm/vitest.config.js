import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [
    svelte({ hot: !process.env.VITEST })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 60000
  },
  resolve: {
    /**
     * Need this since we use 'npm link' to link
     * the locally built sdk to this harnesses dependencies
     */
    preserveSymlinks: true
  }
})
