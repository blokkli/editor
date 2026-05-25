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
            '#blokkli/constants': path.resolve(
              __dirname,
              './src/runtime/constants',
            ),
            '#blokkli/types': path.resolve(__dirname, './src/runtime/types'),
          },
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/*.{test,spec}.ts'],
          environment: 'node',
          // E2E runs against a real (production) build driven by a browser:
          // page load + hydration + editor mount take well over the 5s default,
          // and `setup()` builds the app in a hook.
          testTimeout: 60000,
          hookTimeout: 180000,
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
