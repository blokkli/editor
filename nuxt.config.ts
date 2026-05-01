import { fileURLToPath } from 'node:url'
import drupal from './src/modules/drupal'
import agent from './src/modules/agent'
import tableOfContents from './src/modules/table-of-contents'
import charts from './src/modules/charts'
import iframes from './src/modules/iframes'
import readability from './src/modules/readability'

export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],
  graphqlMiddleware: {
    graphqlEndpoint: 'https://starterkit.ddev.site/de/graphql',
    schemaPath: './build/drupal-schema.graphql',
    downloadSchema: false,
    // graphqlConfigFilePath: '',
    autoImportPatterns: [
      // './src/modules/drupal/graphql/base/*.graphql',
      // './src/modules/drupal/graphql/mutations/*.graphql',
      // './src/modules/drupal/graphql/features/comments.graphql',
      // './src/modules/drupal/graphql/features/conversions.graphql',
      // './src/modules/drupal/graphql/features/fragments.graphql',
      // './src/modules/drupal/graphql/features/import-existing.graphql',
      // './src/modules/drupal/graphql/features/library.graphql',
      // './src/modules/drupal/graphql/features/media-library.graphql',
      // './src/modules/drupal/graphql/features/preview-grant.graphql',
      // // './src/modules/drupal/graphql/features/publish.graphql',
      // './src/modules/drupal/graphql/features/publishNew.graphql',
      // './src/modules/drupal/graphql/features/scheduler.graphql',
      // './src/modules/drupal/graphql/features/search.graphql',
      // './src/modules/drupal/graphql/features/transform.graphql',
      // './src/modules/drupal/graphql/features/transform_host.graphql',
      // './src/modules/drupal/graphql/features/templates.graphql',
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
  revisionLogMessage
}

fragment paragraphsBlokkliParagraphEditContext on ParagraphsBlokkliParagraphEditContext {
  isPublished
  isNew
  publishOn
  unpublishOn
}

fragment blokkliParagraphsType on ParagraphsType {
  id
  label
  description
  allowReusable
  isTranslatable
  hasPublishOn
  hasUnpublishOn
}
`,
    ],
  },
  nitro: {
    experimental: {
      websocket: true,
    },
    typescript: {
      tsConfig: {
        include: [
          '../src/modules/agent/runtime/server/**/*',
          '../src/modules/agent/runtime/shared/**/*',
          '../src/modules/charts/runtime/blokkli/skills/**/*',
        ],
      },
    },
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        composite: true,
        noUncheckedIndexedAccess: true,
      },
      exclude: [
        '../playground',
        '../playground-minimal',
        '../dist',
        '../app',
        '../src/modules/agent/runtime/server/**/*',
        '../src/modules/charts/runtime/blokkli/skills/**/*',
      ],
      include: [
        '../src/runtime/components/**/*',
        '../src/runtime/composables/**/*',
        '../src/runtime/editor/**/*',
        '../src/runtime/helpers/**/*',
        '../src/runtime/plugins/**/*',
        '../src/runtime/types/**/*',
        '../src/global/**/*',
        '../src/modules/drupal/runtime/**/*',
        '../src/modules/agent/runtime/app/**/*',
        '../src/modules/agent/runtime/shared/**/*',
        '../src/modules/table-of-contents/runtime/**/*',
        '../src/modules/iframes/runtime/**/*',
        '../src/modules/readability/runtime/**/*',
        '../src/modules/charts/runtime/blokkli/tools/**/*',
        '../src/modules/charts/runtime/chartTypes/**/*',
        '../src/modules/charts/runtime/components/**/*',
        '../src/modules/charts/runtime/features/**/*',
        '../src/modules/charts/runtime/helpers/**/*',
        '../src/modules/charts/runtime/types.ts',
      ],
    },
    nodeTsConfig: {
      compilerOptions: {
        composite: true,
        noUncheckedIndexedAccess: true,
      },
      include: [
        '../src/module.ts',
        '../src/build/**/*',
        '../src/modules/**/*.ts',
        '../src/global/**/*',
        '../src/modules/agent/module.ts',
        '../src/modules/table-of-contents/module.ts',
        '../src/modules/agent/build/**/*',
      ],
      exclude: [
        '../src/runtime/**/*',
        '../src/modules/*/runtime/**/*',
        '../src/modules/agent/runtime/**/*',
        '../src/modules/table-of-contents/runtime/**/*',
        '../src/modules/charts/runtime/**/*',
      ],
    },
  },

  alias: {
    '#mock': fileURLToPath(new URL('./playground/app/mock', import.meta.url)),
    '~~/helpers': fileURLToPath(
      new URL('./playground/helpers', import.meta.url),
    ),
  },

  blokkli: {
    modules: [
      drupal(),
      tableOfContents(),
      charts(),
      agent({
        // provider: 'anthropic',
        // models: [{ name: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', isDefault: true }],
        provider: 'openai',
        models: [{ name: 'gpt-5', label: 'GPT-5', isDefault: true }],
      }),
      iframes({
        viewports: {
          mobile: { label: 'Mobile', width: 375 },
          tablet: { label: 'Tablet', width: 768 },
          desktop: { label: 'Desktop', width: 1440 },
        },
      }),
      readability(),
    ],
  },
})
