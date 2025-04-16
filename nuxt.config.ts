import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],
  graphqlMiddleware: {
    graphqlEndpoint: 'https://exmaple.com',
    schemaPath: './../blokkli_starterkit/frontend/schema.graphql',
    downloadSchema: false,
    autoImportPatterns: [
      './src/modules/drupal/graphql/**/*.graphql',
      './drupal/mocks.graphql',
    ],
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
      exclude: ['../playground', '../playground-minimal', '../dist'],
    },
  },

  alias: {
    '#mock': fileURLToPath(new URL('./playground/app/mock', import.meta.url)),
    '~~/helpers': fileURLToPath(
      new URL('./playground/helpers', import.meta.url),
    ),
  },
})
