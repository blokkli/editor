import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import tailwind from 'eslint-plugin-tailwindcss'
// import sonarjs from 'eslint-plugin-sonarjs'

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
    // sonarjs.configs.recommended
  ],
)
  .override('nuxt/vue/rules', {
    rules: {
      'vue/no-v-html': 0,
      'vue/multi-word-component-names': 'off',
      'vue/no-empty-component-block': 'error',
      'vue/padding-line-between-blocks': 'error',
      'vue/no-v-for-template-key': 'error',
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
    },
  })
  .override('tailwindcss:rules', {
    rules: {
      'tailwindcss/classnames-order': 'off',
      'tailwindcss/no-custom-classname': [
        'error',
        {
          whitelist: ['bk-grid-overlay', 'bk-drop-element'],
        },
      ],
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
