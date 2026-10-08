// The sandbox's Nuxt app. It runs inside ddev as the "nuxt" daemon
// (`ddev nuxt`), behind nginx at https://blokkli.ddev.site.
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { pathPrefix } from 'nuxt-language-negotiation/negotiators'
import { removeSizes } from 'nuxt-svg-icon-sprite/processors'
import drupal from './../../src/modules/drupal'
import agent from './../../src/modules/agent'
import charts from './../../src/modules/charts'
import iframes from './../../src/modules/iframes'
import readability from './../../src/modules/readability'
import tableOfContents from './../../src/modules/table-of-contents'
import { CHART_COLORS } from './shared/utils/chartColors'
import { LANGUAGES } from './shared/utils/languages'

// Dumped from the local site by `bun run drupal:schema`. The root config types
// the Drupal module against the same file.
const schemaPath = fileURLToPath(
  new URL('../../build/drupal-schema.graphql', import.meta.url),
)

// The block options, for the options form in Drupal's paragraph widget
// (`paragraphs_blokkli.settings:schema_file`).
const optionsSchemaPath = fileURLToPath(
  new URL('../drupal/blokkli-options-schema.json', import.meta.url),
)

export default defineNuxtConfig({
  // nuxt-graphql-middleware must come before blökkli, vuepal before
  // nuxt-language-negotiation.
  modules: [
    'nuxt-easy-texts',
    'nuxt-graphql-middleware',
    'vuepal',
    'nuxt-language-negotiation',
    'nuxt-svg-icon-sprite',
    '../../src/module',
  ],

  // Self-hosted fonts: Source Serif 4 with its optical size axis.
  css: [
    '@fontsource-variable/source-sans-3/wght.css',
    '@fontsource-variable/source-sans-3/wght-italic.css',
    '@fontsource-variable/source-serif-4/opsz.css',
    '~/assets/css/main.css',
  ],

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

  // Every language has its code as a prefix (/en, /de, /fr), which decides the
  // page's language; `/` redirects to /en. Pages get a route per language from
  // their `languageMapping` meta, the others a :langPrefix param.
  languageNegotiation: {
    languages: [...LANGUAGES],
    negotiators: [pathPrefix()],
  },

  // Drupal's toolbar and the local tasks (view, edit, translate…) above the
  // page, for users who may use the toolbar. The pages with
  // `drupalFrontendRoute` (the overviews, the search) write their paths into
  // frontend_routing's config, which locks the aliases of their nodes.
  vuepal: {
    adminToolbar: { enabled: true },
    localTasks: { enabled: true },
    frontendRouting: {
      enabled: true,
      defaultLanguage: 'en',
      outputPath: '../drupal/config/sync/frontend_routing.settings.yml',
    },
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
    // The strings of the demo's own analyzer (app/blokkli/analyzers) and of its
    // agent tool and prompts (blokkli/). English is the default in the code.
    translations: {
      de: {
        blockingenAgentTownData: 'Daten der Gemeinde werden geladen',
        blockingenAgentTownDataDone: 'Daten der Gemeinde geladen',
        blockingenAgentServicePage: 'Dienstleistungsseite schreiben',
        blockingenAgentServicePagePrompt:
          'Schreiben Sie diese Seite als Dienstleistungsseite der Gemeinde. Fragen Sie mich zuerst, was sie abdecken soll.',
        blockingenAgentStyleGuide: 'Schreibregeln prüfen',
        blockingenAgentStyleGuidePrompt:
          'Prüfen Sie die Texte dieser Seite anhand der Schreibregeln, und korrigieren Sie, was dagegen verstösst.',
        blockingenAgentStyleGuidePromptSelection:
          'Prüfen Sie die ausgewählten Blöcke anhand der Schreibregeln, und korrigieren Sie, was dagegen verstösst.',
        blockingenAgentRelatedPages: 'Verwandte Seiten verlinken',
        blockingenAgentRelatedPagesPrompt:
          'Suchen Sie bis zu drei Seiten, die mit dieser verwandt sind, und fügen Sie sie als Teaser unter «Verwandte Themen» ein.',
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
        blockingenAgentTownData: 'Chargement des données de la commune',
        blockingenAgentTownDataDone: 'Données de la commune chargées',
        blockingenAgentServicePage: 'Rédiger une page de prestation',
        blockingenAgentServicePagePrompt:
          'Rédigez cette page comme page de prestation de la commune. Demandez-moi d’abord ce qu’elle doit couvrir.',
        blockingenAgentStyleGuide: 'Vérifier les règles de rédaction',
        blockingenAgentStyleGuidePrompt:
          'Vérifiez les textes de cette page selon les règles de rédaction et corrigez ce qui ne les respecte pas.',
        blockingenAgentStyleGuidePromptSelection:
          'Vérifiez les blocs sélectionnés selon les règles de rédaction et corrigez ce qui ne les respecte pas.',
        blockingenAgentRelatedPages: 'Lier des pages apparentées',
        blockingenAgentRelatedPagesPrompt:
          'Trouvez jusqu’à trois pages apparentées à celle-ci et ajoutez-les comme aperçus dans « Thèmes associés ».',
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
    // site-wide notice, the header's service links, the home page's
    // frequently searched links and the detail page's related topics.
    fieldListTypes: [
      'sidebar',
      'footer',
      'notice',
      'service',
      'quick_links',
      'related',
    ],
    schemaOptionsPath: optionsSchemaPath,
    modules: [
      drupal({ templateEditRouteName: 'blokkli-template' }),
      // The demo's own skills, tool and prompts are in ./blokkli.
      agent({
        provider: 'anthropic',
        // Lets a client replay a scripted conversation instead of the model
        // (E2E tests). Local only: the hosted build must turn it off.
        enableMock: true,
        // Prices in USD per million tokens, from Anthropic's pricing page.
        models: [
          {
            name: 'claude-haiku-4-5',
            label: 'Claude Haiku 4.5',
            routing: true,
            pricing: { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 },
          },
          {
            name: 'claude-sonnet-5-5',
            label: 'Claude Sonnet 5.5',
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
    tsConfig: {
      // The E2E tests against the sandboxes run against this app, and use the
      // test-cases feature's `window.__BLOKKLI__.test`.
      include: ['../blokkli/features/**/*', '../../../test/e2e-drupal/**/*'],
    },
  },

  compatibilityDate: '2026-09-26',

  app: {
    rootId: 'nuxt-root',
  },
})
