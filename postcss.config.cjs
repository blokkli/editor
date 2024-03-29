/* eslint-disable */
module.exports = {
  plugins: {
    'postcss-import': {},
    'postcss-mixins': {},
    'postcss-nested-import': {},
    'tailwindcss/nesting': {},
    'postcss-url': {},
    tailwindcss: {},
    cssnano: {
      preset: 'default',
    },
    'postcss-replace': {
      pattern: /(--tw|\*, ::before, ::after)/g,
      data: {
        '--tw': '--bk-tw',
        '*, ::before, ::after': ':root',
      },
    },
    '@thedutchcoder/postcss-rem-to-px': { baseValue: 16 },
  },
}
