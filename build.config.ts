import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  hooks: {
    'rollup:options': (_ctx, options) => {
      // Fix incorrect path resolution for global constants.
      // Without this, unbuild generates incorrect import paths like
      // '../dist/global/constants/index.js' instead of './global/constants'.
      const originalExternal = options.external
      options.external = (id, importer, isResolved) => {
        if (id.includes('/global/constants')) {
          return true
        }
        if (typeof originalExternal === 'function') {
          return originalExternal(id, importer, isResolved)
        }
        if (Array.isArray(originalExternal)) {
          return originalExternal.includes(id)
        }
        return originalExternal === id
      }
    },
  },
  entries: [
    /**
     * Emit global code/types for build and runtime, for all modules.
     */
    {
      input: './src/global/',
      outDir: `./dist/global`,
      addRelativeDeclarationExtensions: false,
      ext: 'js',
    },

    /**
     * Entry point for defining custom blökkli modules.
     */
    './src/modules/index.ts',

    /**
     * Entry point for the Tailwind config export.
     */
    './src/modules/tailwind/index.ts',

    /**
     * Module: Drupal.
     */
    './src/modules/drupal/index.ts',
    {
      builder: 'copy',
      input: './src/modules/drupal/graphql',
      outDir: './dist/modules/drupal/graphql',
    },
    {
      input: './src/modules/drupal/runtime/',
      outDir: `./dist/modules/drupal/runtime`,
      addRelativeDeclarationExtensions: true,
      ext: 'js',
    },

    /**
     * Module: Agent.
     */
    './src/modules/agent/index.ts',
    {
      input: './src/modules/agent/runtime/',
      outDir: `./dist/modules/agent/runtime`,
      addRelativeDeclarationExtensions: true,
      ext: 'js',
    },

    /**
     * Module: Table of Contents.
     */
    './src/modules/table-of-contents/index.ts',
    {
      input: './src/modules/table-of-contents/runtime/',
      outDir: `./dist/modules/table-of-contents/runtime`,
      addRelativeDeclarationExtensions: true,
      ext: 'js',
    },

    /**
     * Module: Charts.
     */
    './src/modules/charts/index.ts',
    {
      input: './src/modules/charts/runtime/',
      outDir: `./dist/modules/charts/runtime`,
      addRelativeDeclarationExtensions: true,
      ext: 'js',
    },
  ],
  externals: [
    './global/constants',
    'global/constants',
    '#imports',
    '#blokkli/editor/adapter',
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
    '#blokkli/helpers/dropAreaProvider',
    '#blokkli/helpers/debugProvider',
    '#blokkli/translations',
    '#blokkli/generated-types',
    '#blokkli-build/module-types',
    '#blokkli-build/features',
    'defu',
    'unplugin',
    'magic-string',
    'ufo',
    'ohash',
    'typescript',
    'estree-walker',
    'oxc-walker',
    'micromatch',
    'acorn',
    'pathe',
    'graphql',
    'consola',
    'webpack-sources',
    'webpack-virtual-modules',
    '@jridgewell/sourcemap-codec',
    'nuxt-graphql-middleware/utils',
    '#nuxt-graphql-middleware/sources',
    '#graphql-operations',
  ],
  replace: {
    'import.meta.dev': 'undefined',
    'process.env.PLAYGROUND_MODULE_BUILD': 'undefined',
  },
})
