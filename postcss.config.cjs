/* eslint-disable */
module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-mixins'),
    require('postcss-nested-import'),
    require('postcss-nesting'),
    require('postcss-url'),
    require('@tailwindcss/postcss'),
    require('./src/build/postcssMangleClasses.cjs'),
    require('postcss-replace')({
      pattern: /(--tw|\*, ::before, ::after)/g,
      data: {
        '--tw': '--bk-tw',
        '*, ::before, ::after':
          '.bk, .bk *, .bk-sidebar, .bk ::before, .bk ::after, .bk-vars, .bk-vars ::before, .bk-vars ::after',
        '::backdrop': '.bk::backdrop, .bk ::backdrop',
      },
    }),
    require('@thedutchcoder/postcss-rem-to-px')({ baseValue: 16 }),
    require('./src/build/postcssUnwrapLayers.cjs'),
  ],
}
