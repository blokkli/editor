import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

// GitHub's runners have 4 cores for the tests, Drupal, nginx, Nuxt and the
// browsers: a test takes several times as long there.
const onGitHub = process.env.GITHUB_ACTIONS === 'true'

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
            // Runtime code imports Vue composables via Nuxt's auto-import
            // alias. Outside of a Nuxt context they all come from Vue itself.
            '#imports': 'vue',
            '#blokkli-build': path.resolve(__dirname, './.nuxt/blokkli'),
            '#blokkli/editor/helpers/diff': path.resolve(
              __dirname,
              './src/runtime/editor/helpers/diff',
            ),
            '#blokkli/constants': path.resolve(
              __dirname,
              './src/runtime/constants',
            ),
            '#blokkli/runtime-helpers': path.resolve(
              __dirname,
              './src/runtime/helpers/runtimeHelpers',
            ),
            // Must come after the more specific `#blokkli/editor/...` entries
            // above — Vite matches aliases in order.
            '#blokkli/editor': path.resolve(__dirname, './src/runtime/editor'),
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
          name: 'e2e-drupal',
          // Against a sandbox of the ddev site, one per worker
          // (test/e2e-drupal/support/sandbox.ts).
          include: ['test/e2e-drupal/**/*.{test,spec}.ts'],
          environment: 'node',
          globalSetup: ['test/e2e-drupal/globalSetup.ts'],
          setupFiles: ['test/e2e-drupal/setup.ts'],
          testTimeout: onGitHub ? 45000 : 15000,
          hookTimeout: onGitHub ? 60000 : 30000,
          maxWorkers: onGitHub ? 2 : 4,
          // A poll that holds returns at once; one that doesn't fails after 5 s
          // instead of vitest's 1 s.
          expect: { poll: { timeout: 5000 } },
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
  server: {
    watch: {
      // The Drupal site (vendor, core, the paragraphs_blokkli submodule) is
      // never imported by tests; watching it only costs inotify watches.
      ignored: [
        path.resolve(__dirname, 'sandbox/drupal') + '/**',
        path.resolve(__dirname, '.ddev') + '/**',
      ],
    },
  },
})
