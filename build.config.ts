import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    '#blokkli/adapter',
    '#blokkli/types',
    '#blokkli/translations',
    '#blokkli/generated-types',
    'defu',
    'unplugin',
    'magic-string',
    'estree-walker',
    'acorn',
    'webpack-sources',
    'webpack-virtual-modules',
    '@jridgewell/sourcemap-codec',
  ],
})
