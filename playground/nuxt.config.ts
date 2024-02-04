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
    fieldListTypes: ['header'],
    globalOptions: {
      background: {
        type: 'radios',
        label: 'Background',
        default: 'white',
        displayAs: 'colors',
        options: {
          white: 'bg-white',
          light: 'bg-mono-100',
          dark: 'bg-mono-800',
        },
      },
    },

    theme: 'arctic',

    enableThemeEditor: true,

    translations: {
      en: {
        editIndicatorLabel: 'Edit page content',
      },
    },

    schemaOptionsPath: '~/options-schema.json',

    settingsOverride: {
      'feature:artboard:scrollSpeed': {
        default: 0.9,
      },
    },

    featureImports: ['./blokkli/DemoFeature.vue'],
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: ['./assets/icons/**/*.svg', './../src/icons/logo.svg'],
      },
    },
  },
})
