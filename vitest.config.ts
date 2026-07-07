import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
          environment: 'node',
          server: {
            deps: {
              inline: ['html-diff-ts'],
            },
          },
        },
        resolve: {
          alias: {
            '#blokkli-build': path.resolve(__dirname, './.nuxt/blokkli'),
            '#blokkli/editor/helpers/diff': path.resolve(
              __dirname,
              './src/runtime/editor/helpers/diff',
            ),
            '#blokkli/constants': path.resolve(
              __dirname,
              './src/runtime/constants',
            ),
            '#blokkli/helpers': path.resolve(
              __dirname,
              './src/runtime/helpers',
            ),
            '#blokkli/types': path.resolve(__dirname, './src/runtime/types'),
          },
        },
      },
      {
        test: {
          name: 'e2e',
          // Recurse: feature-specific specs live under `test/e2e/features/`.
          include: ['test/e2e/**/*.{test,spec}.ts'],
          environment: 'node',
          // E2E drives a real browser against the locally-running playground.
          // No build runs in `setup()` (host mode), so timeouts only need to
          // cover page load + hydration + a few editor interactions — not a
          // ~30s Nuxt build. A genuinely stuck test fails fast instead of
          // burning a minute on a transition that never finishes.
          testTimeout: 15000,
          hookTimeout: 15000,
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})
