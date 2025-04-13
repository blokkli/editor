export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],
  graphqlMiddleware: {
    graphqlEndpoint: 'https://exmaple.com',
    schemaPath: './../blokkli_starterkit/frontend/schema.graphql',
    downloadSchema: false,
    autoImportPatterns: [
      './src/runtime/adapter/drupal/graphql/*.graphql',
      './drupal/mocks.graphql',
    ],
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
    },
  },
})
