export default defineNuxtConfig({
  ssr: false,
  modules: ['../src/module'],

  imports: {
    autoImport: false,
  },

  app: {
    rootId: 'nuxt-root',
    head: {
      viewport:
        'width=device-width, height=device-height, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0',
    },
  },

  blokkli: {
    itemEntityType: 'block',
  },
})
