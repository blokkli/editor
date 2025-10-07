import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],
  graphqlMiddleware: {
    graphqlEndpoint: 'https://example.com',
    // schemaPath: './../blokkli_starterkit/frontend/schema.graphql',
    schemaPath: './../bs.ch/frontend/schema.graphql',
    downloadSchema: false,
    autoImportPatterns: [
      './src/modules/drupal/graphql/base/*.graphql',
      './src/modules/drupal/graphql/mutations/*.graphql',
      './src/modules/drupal/graphql/features/comments.graphql',
      './src/modules/drupal/graphql/features/conversions.graphql',
      './src/modules/drupal/graphql/features/fragments.graphql',
      './src/modules/drupal/graphql/features/import-existing.graphql',
      './src/modules/drupal/graphql/features/library.graphql',
      './src/modules/drupal/graphql/features/media-library.graphql',
      './src/modules/drupal/graphql/features/preview-grant.graphql',
      // './src/modules/drupal/graphql/features/publish.graphql',
      './src/modules/drupal/graphql/features/publishNew.graphql',
      './src/modules/drupal/graphql/features/scheduler.graphql',
      './src/modules/drupal/graphql/features/search.graphql',
      './src/modules/drupal/graphql/features/transform.graphql',
      './src/modules/drupal/graphql/features/transform_host.graphql',
      './drupal/mocks.graphql',
    ],
    documents: [
      `
fragment paragraphsBlokkliPublishOptions on ParagraphsBlokkliPublishOptions {
  canPublish
  isRevisionable
  hasRevisionLogMessage
  lastChanged
  canSchedule
  publishOn
}
`,
    ],
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
      exclude: ['../playground', '../playground-minimal', '../dist'],
      include: [
        '../src/runtime/components/**/*',
        '../src/modules/drupal/runtime/**/*',
      ],
    },
  },

  alias: {
    '#mock': fileURLToPath(new URL('./playground/app/mock', import.meta.url)),
    '~~/helpers': fileURLToPath(
      new URL('./playground/helpers', import.meta.url),
    ),
  },
})
