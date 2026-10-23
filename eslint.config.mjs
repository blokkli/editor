import { fileURLToPath } from 'node:url'
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import tailwind from 'eslint-plugin-tailwindcss'
import importX from 'eslint-plugin-import-x'
import oxlint from 'eslint-plugin-oxlint'

const tailwindEntryCSS = fileURLToPath(
  new URL('./css/index.css', import.meta.url),
)

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt(
  {
    features: {
      // Rules for module authors
      tooling: true,
    },
    dirs: {
      src: ['./playground'],
    },
  },
  [
    ...tailwind.configs['flat/recommended'],
    {
      settings: {
        tailwindcss: {
          config: tailwindEntryCSS,
        },
      },
    },
    // sonarjs.configs.recommended
  ],
)
  .override('nuxt/vue/rules', {
    rules: {
      'vue/no-v-html': 0,
      'vue/multi-word-component-names': 'off',
      'vue/no-empty-component-block': 'error',
      'vue/padding-line-between-blocks': 'error',
      'vue/no-v-for-template-key-on-child': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/component-api-style': 'error',
      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts',
          },
        },
      ],
      'vue/block-order': [
        'error',
        {
          order: [['script', 'template'], 'style'],
        },
      ],
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
          },
        },
      ],
    },
  })
  .override('nuxt/typescript/rules', {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  })
  .override('tailwindcss:rules', {
    rules: {
      'tailwindcss/classnames-order': 'off',
      'tailwindcss/no-custom-classname': 'off',
    },
  })
  .overrideRules({
    'sonarjs/pluginRules-of-hooks': ['off'],
    'sonarjs/no-duplicate-string': [
      'error',
      {
        ignoreStrings:
          'block:translate,block:edit,entity:edit,entity:translate,dragging:end,block:append,dragging:start',
      },
    ],
  })
  .append({
    files: ['src/**/*.ts', 'src/**/*.vue'],
    ignores: ['**/*.spec.ts'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: false,
          optionalDependencies: true,
          peerDependencies: true,
          // Packages guaranteed by Nuxt/unjs ecosystem
          whitelist: [
            // Nuxt core
            '@nuxt/kit',
            '@nuxt/schema',
            'nuxt',
            'vue',
            // unjs (maintained by Nuxt team)
            'pathe',
            'defu',
            'ohash',
            'ufo',
            'unplugin',
            // Nitro's, for the server handlers
            'h3',
            // Drupal module optional dependencies
            'graphql',
            'nuxt-graphql-middleware',
          ],
        },
      ],
    },
  })
  .append({
    // The editor renders content: text goes into `{{ }}`. Each `v-html` that
    // stays says why in its disable comment (plans/xss).
    files: ['src/**/*.vue'],
    rules: {
      'vue/no-v-html': 'error',
    },
  })
  .append({
    // Markup set on an element of the page loads and runs, even while the
    // element is detached (plans/xss, X6). And a page that enforces Trusted
    // Types refuses markup that no policy vouches for: the editor's is in
    // helpers/html (plans/xss, step 8).
    files: ['src/**/*.ts', 'src/**/*.vue'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/], CallExpression[callee.property.name='insertAdjacentHTML']",
          message:
            "Parse markup with parseHtml() from '#blokkli/editor/helpers/html', render it with setSanitizedHtml(). Otherwise say why in a disable comment.",
        },
        {
          selector: "NewExpression[callee.name='DOMParser']",
          message:
            "Parse markup with parseHtmlDocument() from '#blokkli/editor/helpers/html'.",
        },
      ],
    },
  })
  .append(...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'))
