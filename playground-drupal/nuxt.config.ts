// The Nuxt app for the Drupal playground. It runs inside ddev as the "nuxt"
// daemon (`ddev nuxt`), behind nginx at https://blokkli.ddev.site.
// See plans/drupal-setup/06-playground-drupal-app.md.
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { removeSizes } from 'nuxt-svg-icon-sprite/processors'
import drupal from './../src/modules/drupal'
import agent from './../src/modules/agent'
import charts from './../src/modules/charts'
import iframes from './../src/modules/iframes'
import readability from './../src/modules/readability'
import tableOfContents from './../src/modules/table-of-contents'
import { CHART_COLORS } from './shared/chartColors'

// Dumped from the local site by `bun run drupal:schema`. The root config types
// the Drupal module against the same file.
const schemaPath = fileURLToPath(
  new URL('../build/drupal-schema.graphql', import.meta.url),
)

// The block options, for the options form in Drupal's paragraph widget
// (`paragraphs_blokkli.settings:schema_file`).
const optionsSchemaPath = fileURLToPath(
  new URL('../drupal/blokkli-options-schema.json', import.meta.url),
)

export default defineNuxtConfig({
  // nuxt-graphql-middleware must come before blökkli.
  modules: [
    'nuxt-easy-texts',
    'nuxt-graphql-middleware',
    'vuepal',
    'nuxt-svg-icon-sprite',
    '../src/module',
  ],

  imports: {
    autoImport: false,
  },

  // Self-hosted fonts: Source Serif 4 with its optical size axis.
  css: [
    '@fontsource-variable/source-sans-3/wght.css',
    '@fontsource-variable/source-sans-3/wght-italic.css',
    '@fontsource-variable/source-serif-4/opsz.css',
    '~/assets/css/main.css',
  ],

  // Logged-in users, editing and the hosted instance get the SPA, see
  // server/middleware/spa.ts.
  routeRules: {
    '/': { redirect: '/en' },
  },

  runtimeConfig: {
    // Drupal, through nginx in the same container.
    drupalUrl: 'http://127.0.0.1',
  },

  // `bun run drupal:schema` rewrites the schema; restart so that the Drupal
  // module detects the features again.
  watch: [schemaPath],

  graphqlMiddleware: {
    // Only used to download the schema, which `bun run drupal:schema` does.
    graphqlEndpoint: 'http://127.0.0.1/en/graphql',
    downloadSchema: false,
    schemaPath,
    autoImportPatterns: ['./app/**/*.graphql'],
  },

  // Drupal's toolbar and the local tasks (view, edit, translate…) above the
  // page, for users who may use the toolbar.
  vuepal: {
    adminToolbar: { enabled: true },
    localTasks: { enabled: true },
  },

  // UI strings, translated in Drupal's texts module. The fragment is committed:
  // nuxt-graphql-middleware reads the documents before it's generated.
  easyTexts: {
    pattern: ['~/**/*.{js,ts,vue}'],
    generators: [
      {
        outputPath: './app/graphql/fragment.easyTexts.graphql',
        generate: 'drupal-graphql-texts',
      },
    ],
  },

  // The default pattern resolves against the root dir, not app/.
  svgIconSprite: {
    ariaHidden: true,
    sprites: {
      default: {
        importPatterns: ['./app/assets/symbols/*.svg'],
        processSpriteSymbol: [removeSizes()],
      },
    },
  },

  blokkli: {
    globalOptions: {
      width: {
        type: 'radios',
        label: { en: 'Width', de: 'Breite', fr: 'Largeur' },
        default: 'content',
        displayAs: 'icons',
        options: {
          content: {
            label: { en: 'Content', de: 'Inhalt', fr: 'Contenu' },
            icon: 'bk_mdi_width_normal',
          },
          wide: {
            label: { en: 'Wide', de: 'Breit', fr: 'Large' },
            icon: 'bk_mdi_width_wide',
          },
          full: {
            label: { en: 'Full', de: 'Volle Breite', fr: 'Pleine largeur' },
            icon: 'bk_mdi_width_full',
          },
        },
      },
      // blökkli's own definition, with labels in every language: the editor
      // doesn't translate them.
      bkVisibleLanguages: {
        type: 'checkboxes',
        label: {
          en: 'Visible languages',
          de: 'Sichtbare Sprachen',
          fr: 'Langues visibles',
        },
        description: {
          en: 'Only show on specific languages.',
          de: 'Nur in bestimmten Sprachen anzeigen.',
          fr: 'Afficher uniquement dans certaines langues.',
        },
        options: {},
        default: [],
      },
    },
    colorOptions: CHART_COLORS,
    // The strings of the demo's own analyzer (app/blokkli/analyzers). English
    // is the default in the code.
    translations: {
      de: {
        blockingenWrongLanguageLabel: 'Sprache der Texte',
        blockingenWrongLanguage: 'Text in einer anderen Sprache',
        blockingenWrongLanguageDescriptionOne:
          'Ein Text ist nicht auf @language, der Sprache der Seite. Übersetzen Sie ihn. Ist die Sprache gewollt, z. B. bei einem Zitat, ignorieren Sie den Befund.',
        blockingenWrongLanguageDescription:
          '@count Texte sind nicht auf @language, der Sprache der Seite. Übersetzen Sie sie. Ist die Sprache gewollt, z. B. bei einem Zitat, ignorieren Sie den Befund.',
        blockingenWrongLanguageNode: 'Auf @language',
        blockingenWrongLanguageValid: 'Texte in der Sprache der Seite',
        blockingenWrongLanguageValidDescription:
          'Alle Texte sind auf @language.',
      },
      fr: {
        blockingenWrongLanguageLabel: 'Langue des textes',
        blockingenWrongLanguage: 'Texte dans une autre langue',
        blockingenWrongLanguageDescriptionOne:
          'Un texte n’est pas en @language, la langue de la page. Traduisez-le. Si la langue est voulue, p. ex. pour une citation, ignorez le résultat.',
        blockingenWrongLanguageDescription:
          '@count textes ne sont pas en @language, la langue de la page. Traduisez-les. Si la langue est voulue, p. ex. pour une citation, ignorez le résultat.',
        blockingenWrongLanguageNode: 'En @language',
        blockingenWrongLanguageValid: 'Textes dans la langue de la page',
        blockingenWrongLanguageValidDescription:
          'Tous les textes sont en @language.',
      },
    },
    // The chart block and ECharts load only on pages with a chart.
    chunkNames: ['global', 'rare', 'chart'],
    // The fields outside the main content: the page's sidebar, the footer, the
    // site-wide notice, the header's service links and the home page's
    // frequently searched links.
    fieldListTypes: ['sidebar', 'footer', 'notice', 'service', 'quick_links'],
    schemaOptionsPath: optionsSchemaPath,
    modules: [
      drupal({ templateEditRouteName: 'blokkli-template' }),
      agent({
        provider: 'anthropic',
        enableMock: true,
        models: [
          {
            name: 'claude-haiku-4-5',
            label: 'Claude Haiku 4.5',
            routing: true,
            pricing: { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 },
          },
          {
            name: 'claude-sonnet-5',
            label: 'Claude Sonnet 5',
            isDefault: true,
            pricing: { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 },
          },
        ],
      }),
      charts(),
      tableOfContents(),
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

  vite: {
    plugins: [tailwindcss()],
    // Imported on the first run of the language analyzer
    // (app/blokkli/analyzers): found only then, Vite would reload the editor.
    optimizeDeps: {
      include: ['eld/extrasmall'],
    },
    server: {
      // Requests arrive through nginx with the site's Host (and, later, the
      // sandbox subdomains), which Vite would otherwise reject.
      allowedHosts: true,
    },
  },

  nitro: {
    experimental: {
      // The agent talks to its server over a WebSocket.
      websocket: true,
    },
  },

  typescript: {
    strict: true,
  },

  compatibilityDate: '2026-09-26',

  app: {
    rootId: 'nuxt-root',
  },
})
