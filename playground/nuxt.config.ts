import packageJson from './../package.json'

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxt/test-utils/module',
    '../src/module',
    '@nuxtjs/tailwindcss',
    'nuxt-svg-icon-sprite',
  ],

  imports: {
    autoImport: false,
  },

  runtimeConfig: {
    openaiKey: process.env.OPENAI_KEY || '',
    public: {
      version: packageJson.version,
    },
  },

  app: {
    rootId: 'nuxt-root',
    head: {
      viewport:
        'width=device-width, height=device-height, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0',
    },
  },

  vite: {
    server: {
      watch: {
        usePolling: true,
      },
    },
  },

  blokkli: {
    itemEntityType: 'block',
    fieldListTypes: ['header', 'inline'],
    globalOptions: {
      background: {
        type: 'radios',
        label: 'Background',
        default: 'white',
        displayAs: 'colors',
        options: {
          white: { class: 'bg-white', label: 'White' },
          light: { class: 'bg-mono-100', label: 'Light' },
          dark: { class: 'bg-mono-800', label: 'Dark' },
        },
      },
    },

    chunkNames: ['rare', 'global'],

    theme: 'arctic',

    enableThemeEditor: true,

    translations: {
      en: {
        editIndicatorLabel: 'Edit page content',
      },
    },

    forceDefaultLanguage: false,

    schemaOptionsPath: '~/options-schema.json',

    settingsOverride: {
      'feature:artboard:scrollSpeed': {
        default: 0.9,
      },
    },

    storageDefaults: {
      blockFavorites: ['title', 'text', 'card', 'button'],
    },

    featureImports: ['./blokkli/DemoFeature.vue'],
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: [
          './assets/icons/**/*.svg',
          './../src/runtime/icons/**/*.svg',
        ],
      },
    },
  },

  compatibilityDate: '2024-07-28',
})
