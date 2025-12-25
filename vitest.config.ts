import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    // include: ['test/**/*.test.ts'],
    coverage: {
      all: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.*'],
    },
  },

  resolve: {
    alias: {
      '#blokkli-build': path.resolve(__dirname, './.nuxt/blokkli'),
      '#blokkli/constants': path.resolve(__dirname, './src/runtime/constants'),
      '#blokkli/types': path.resolve(__dirname, './src/runtime/types'),
    },
  },
})
