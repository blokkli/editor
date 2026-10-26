// The sandbox's Nuxt app. It runs inside ddev as the "nuxt" daemon
// (`ddev nuxt`), behind nginx at https://blokkli.ddev.site: the dev server
// locally, the production build (`bun run sandbox:build`) when hosted, and the
// E2E build on GitHub.
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

// The E2E build (`SANDBOX_E2E_BUILD=true`): a production build with what the
// E2E tests need from the dev server, the agent's mock and the Test Cases
// sidebar. GitHub runs the tests against it (.github/workflows/ci.yml).
const e2eBuild = process.env.SANDBOX_E2E_BUILD === 'true'
if (e2eBuild && process.env.IS_DDEV_HOSTED === 'true') {
  throw new Error(
    'SANDBOX_E2E_BUILD is never hosted: its agent mock lets any client skip the API key.',
  )
}
const testSeams = process.env.NODE_ENV !== 'production' || e2eBuild

// The dev server, as opposed to a build.
const devServer = process.env.NODE_ENV !== 'production'

// The Content-Security-Policy: the strictest that the site and the editor work
// under, so that blökkli works on projects that have one.
// nuxt-security gives Nuxt's own scripts, styles and links a nonce per
// response. Uploads and pasted images are previewed from blob: URLs, a pasted
// YouTube link with its thumbnail from YouTube's image host. On the dev
// server, styles go without the nonce and may be inline, for Nuxt devtools and
// the error overlay: what counts is the build, which GitHub runs the E2E tests
// against. The E2E tests fail on any violation they don't know
// (test/e2e-drupal/support/csp.ts).
const contentSecurityPolicy = {
  'default-src': ["'none'"],
  'script-src': ["'nonce-{{nonce}}'", "'strict-dynamic'", "'report-sample'"],
  'script-src-attr': ["'none'"],
  'style-src': devServer
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'nonce-{{nonce}}'", "'report-sample'"],
  'img-src': ["'self'", 'blob:', 'https://i.ytimg.com'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ["'self'"],
  'media-src': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': false as const,
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'none'"],
  'object-src': ["'none'"],
  // Trusted Types: the editor's markup comes with its policy, `blokkli`, its
  // dependencies' through the page's `default`
  // (app/plugins/trustedTypes.client.ts). Vue's and DOMPurify's own policies
  // are `vue` and `dompurify`. Not on the dev server, where Nuxt's error
  // overlay and devtools pass strings.
  'require-trusted-types-for': devServer ? (false as const) : "'script'",
  'trusted-types': devServer
    ? (false as const)
    : ['vue', 'dompurify', 'blokkli', 'default'],
  'upgrade-insecure-requests': true,
}

export default defineNuxtConfig({
  // nuxt-graphql-middleware must come before blökkli, vuepal before
  // nuxt-language-negotiation.
  modules: [
    'nuxt-easy-texts',
    'nuxt-graphql-middleware',
    'vuepal',
    'nuxt-language-negotiation',
    'nuxt-svg-icon-sprite',
    'nuxt-security',
    '../../src/module',
  ],

  // The headers of nuxt-security's strict mode, with the policy above.
  security: {
    strict: true,
    headers: {
      contentSecurityPolicy,
      // TLS is the proxy's: ddev's router locally, the server's when hosted.
      strictTransportSecurity: false,
    },
    // Behind nginx every request comes from 127.0.0.1: one limit for all
    // users, which the E2E tests' workers exceed in minutes.
    rateLimiter: false,
  },

  routeRules: {
    // The editor's requests carry markup: texts, comments and imports in its
    // GraphQL operations, and the agent's prompts. nuxt-security's XSS
    // validator answers 400 to any request whose markup its filter would
    // change.
    '/api/graphql_middleware/**': { security: { xssValidator: false } },
    '/api/blokkli/agent/**': { security: { xssValidator: false } },
  },

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
    optionGroups: {
      navigation: { en: 'Navigation', de: 'Navigation', fr: 'Navigation' },
      size: { en: 'Size', de: 'Grösse', fr: 'Taille' },
    },
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
      drupal(),
      // The demo's own skills, tool and prompts are in ./blokkli.
      agent({
        provider: 'anthropic',
        // Lets a client replay a scripted conversation instead of the model
        // (E2E tests). Only in the dev server and the E2E build, never in the
        // hosted one: any client could skip the API key and have the server
        // run the tool calls of its choosing.
        enableMock: testSeams,
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
    // What the editor and the app import lazily, e.g. `eld/extrasmall` on the
    // first run of the language analyzer (app/blokkli/analyzers). Found only
    // then, Vite would bundle it and reload every open page: with an empty
    // cache (a fresh checkout), in the middle of the E2E tests. Vite names
    // what it found at runtime in the dev server's log
    // ("Vite discovered new dependencies at runtime", "New dependencies
    // found").
    optimizeDeps: {
      include: [
        '@floating-ui/dom',
        '@tiptap/core',
        '@tiptap/extension-emoji',
        '@tiptap/extension-mention',
        '@tiptap/extension-task-item',
        '@tiptap/extension-task-list',
        '@tiptap/starter-kit',
        '@tiptap/vue-3',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'artboard-deluxe',
        'axe-core',
        'echarts/charts',
        'echarts/components',
        'echarts/core',
        'echarts/renderers',
        'eld/extrasmall',
        'fzf',
        'get-video-id',
        'html-diff-ts',
        'json5',
        'mammoth',
        'marked',
        'mitt',
        'papaparse',
        'pofile',
        'qrcode.vue',
        'syllable',
        'turndown',
        'twgl.js',
        'vue-echarts',
        'vue3-click-away',
        'zod',
      ],
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

  // The Test Cases sidebar (blokkli/features/test-cases), only where the
  // agent's mock is. blökkli finds its features through Nuxt, which skips what
  // it ignores; `devOnly` would leave it out of the E2E build too.
  ignore: testSeams ? [] : ['blokkli/features/test-cases'],

  $production: {
    // A build empties its build directory first: its own, so that it can run
    // next to the dev server.
    buildDir: 'node_modules/.cache/nuxt-production',
    // `ddev deploy` builds next to the build that runs (.output), and swaps
    // them once the templates are baked.
    nitro: {
      output: { dir: process.env.SANDBOX_OUTPUT_DIR || '.output' },
    },
  },

  compatibilityDate: '2026-09-26',

  app: {
    rootId: 'nuxt-root',
  },
})
