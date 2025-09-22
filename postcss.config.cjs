/* eslint-disable */
module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-mixins'),
    require('postcss-nested-import'),
    require('tailwindcss/nesting'),
    require('postcss-url'),
    require('tailwindcss'),
    require('postcss-replace')({
      pattern: /(--tw|\*, ::before, ::after)/g,
      data: {
        '--tw': '--bk-tw',
        '*, ::before, ::after':
          '.bk, .bk *, .bk-sidebar, .bk ::before, .bk ::after',
        '::backdrop': '.bk::backdrop, .bk ::backdrop',
      },
    }),
    require('@thedutchcoder/postcss-rem-to-px')({ baseValue: 16 }),
  ],
}
