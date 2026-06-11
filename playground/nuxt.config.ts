import { USED_MATERIAL_ICONS } from '../src/build/used-icons'
import packageJson from './../package.json'
import { fileURLToPath } from 'node:url'
import { removeSizes } from 'nuxt-svg-icon-sprite/processors'
import tailwindcss from '@tailwindcss/vite'
import testExtensionModule from './app/blokkli/modules/test-extension'
import demoFeatureModule from './app/blokkli/modules/demo-feature'
import agentModule from './../src/modules/agent'
import tableOfContents from './../src/modules/table-of-contents'
import charts from './../src/modules/charts'
import iframes from './../src/modules/iframes'
import readability from './../src/modules/readability'
import { colorOptions } from './.config/blokkli'

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

  modules: ['@nuxt/test-utils/module', '../src/module', 'nuxt-svg-icon-sprite'],

  css: ['~/assets/css/tailwind.css'],

  debug: false,

  imports: {
    autoImport: true,
  },

  runtimeConfig: {
    openaiKey: process.env.OPENAI_KEY || '',
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    deeplKey: process.env.DEEPL_KEY || '',
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
    experimental: {
      websocket: true,
    },
  },

  experimental: {
    // @todo remove once fix landed in Nuxt: https://github.com/nuxt/nuxt/issues/34957#issuecomment-4355775463
    viteEnvironmentApi: true,
  },

  vite: {
    plugins: [tailwindcss()],
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
      include: ['../../test/e2e/**/*', '../blokkli/features/**/*'],
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
    },
  },

  blokkli: {
    modules: [
      testExtensionModule(),
      demoFeatureModule(),
      tableOfContents(),
      charts(),
      iframes({
        viewports: {
          mobile: { label: 'Mobile', width: 375 },
          tablet: { label: 'Tablet', width: 768 },
          desktop: { label: 'Desktop', width: 1440 },
        },
      }),
      agentModule({
        allowedFetchOrigins: ['https://stadt.winterthur.ch'],
        debugPrompt: true,
        provider: 'anthropic',
        models: [
          {
            name: 'claude-haiku-4-5',
            // name: 'claude-sonnet-4-6',
            label: 'Claude Haiku 4.5',
            isDefault: true,
            routing: true,
            pricing: { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 },
          },
        ],
        // provider: 'openai',
        // models: [
        //   // {
        //   //   name: 'gpt-5.2',
        //   //   label: 'GPT-5.2',
        //   //   isDefault: true,
        //   //   pricing: {
        //   //     input: 1.75,
        //   //     cacheWrite: 1.75,
        //   //     cacheRead: 0.175,
        //   //     output: 14,
        //   //   },
        //   // },
        //   {
        //     name: 'gpt-5-mini',
        //     label: 'GPT-5 Mini',
        //     isDefault: true,
        //     pricing: {
        //       input: 0.25,
        //       cacheWrite: 0.25,
        //       cacheRead: 0.025,
        //       output: 2,
        //     },
        //   },
        // ],
        defaultPrompts: [
          'Rewrite the page title and lead text',
          'Add a new text block with a summary of the AI features',
          'Move the last section to the top of the page',
          'Translate all content to German',
        ],
      }),
      readability(),
    ],
    pattern: [
      playgroundFolder + 'app/components/Blokkli/**/*.vue',
      playgroundFolder + 'app/pages/**/*.vue',
    ],
    itemEntityType: 'paragraph',
    fieldListTypes: ['header', 'inline'],
    providerTypes: ['contentPage'],
    colorOptions,
    globalOptions: {
      background: {
        type: 'radios',
        label: 'Background',
        default: 'white',
        displayAs: 'colors',
        options: {
          white: {
            class: 'bg-white',
            label: 'White',
            description: 'A nice white color.',
          },
          light: {
            class: 'bg-mono-100',
            label: 'Light',
            description: 'A slightly gray color.',
          },
          dark: {
            class: 'bg-mono-800',
            label: 'Dark',
            description:
              'A full dark color that also inverts text color to white.',
          },
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
