import { USED_MATERIAL_ICONS } from '../src/build/used-icons'
import packageJson from './../package.json'
import { fileURLToPath } from 'node:url'
import { removeSizes } from 'nuxt-svg-icon-sprite/processors'

const playgroundFolder = fileURLToPath(new URL('./', import.meta.url))

const IS_DEV = process.env.NODE_ENV === 'development'
const FORCE_GERMAN = true

const additionalIcons = [
  'bk_mdi_lightbulb',
  'bk_mdi_power',
  'bk_mdi_format_h2',
  'bk_mdi_buttons_alt',
]

export default defineNuxtConfig({
  ssr: false,
  devtools: {
    enabled: true,
  },

  alias: {
    '#mock': fileURLToPath(new URL('./app/mock', import.meta.url)),
  },

  modules: [
    '@nuxt/test-utils/module',
    '../src/module',
    '@nuxtjs/tailwindcss',
    'nuxt-svg-icon-sprite',
  ],
  tailwindcss: {
    cssPath: './app/assets/css/tailwind.css',
  },

  debug: false,

  imports: {
    autoImport: true,
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

  nitro: {
    minify: false,
  },

  vite: {
    build: {
      minify: false,
    },
    optimizeDeps: {
      exclude: ['artboard-deluxe'],
    },
    server: {
      watch: {
        usePolling: true,
      },
    },
  },

  typescript: {
    shim: true,
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
    },
  },

  blokkli: {
    pattern: [
      playgroundFolder + 'app/components/Blokkli/**/*.vue',
      playgroundFolder + 'app/pages/**/*.vue',
    ],
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
      alignment: {
        type: 'radios',
        label: 'Alignment',
        default: 'center',
        displayAs: 'icons',
        options: {
          left: {
            label: 'Left',
            icon: 'bk_mdi_format_align_left',
          },
          center: {
            label: 'Center',
            icon: 'bk_mdi_format_align_center',
          },
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

    defaultLanguage: IS_DEV && FORCE_GERMAN ? 'de' : 'en',
    forceDefaultLanguage: IS_DEV && FORCE_GERMAN,

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

    getBundlePropsType: function (_bundle, definition) {
      // Every component exports its props as a type called Props.
      return {
        typeName: 'Props',
        from: definition.filePath,
      }
    },
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: [
          './app/assets/icons/**/*.svg',
          './../src/runtime/editor/icons/svg/**/*.svg',
        ],
        symbolFiles: [...USED_MATERIAL_ICONS, ...additionalIcons].reduce<
          Record<string, string>
        >((acc, name) => {
          const path =
            './../node_modules/@material-symbols/svg-600/rounded/' +
            name.replace('bk_mdi_', '') +
            '.svg'
          acc[name] = path
          return acc
        }, {}),
        processSpriteSymbol: [removeSizes()],
      },
    },
  },

  compatibilityDate: '2025-08-21',
})
