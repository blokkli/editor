import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    '#imports',
    '#blokkli/adapter',
    '#blokkli/types',
    '#blokkli/icons',
    '#blokkli/constants',
    '#blokkli/definitions',
    '#blokkli/helpers',
    '#blokkli/helpers/broadcastProvider',
    '#blokkli/helpers/featuresProvider',
    '#blokkli/helpers/themeProvider',
    '#blokkli/helpers/tourProvider',
    '#blokkli/helpers/commandsProvider',
    '#blokkli/translations',
    '#blokkli/generated-types',
    '#blokkli/types/generatedModuleTypes',
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
