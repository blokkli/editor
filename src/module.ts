import { promises as fsp } from 'node:fs'
import { version } from './../package.json'
import {
  addBuildPlugin,
  addComponent,
  addImports,
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  resolveFiles,
} from '@nuxt/kit'
import type { ResolvedNuxtTemplate } from '@nuxt/schema'
import BlockExtractor from './Extractor/BlockExtractor'
import { DefinitionPlugin } from './vitePlugin'
import {
  BK_HIDDEN_GLOBALLY,
  BK_VISIBLE_LANGUAGES,
} from './runtime/helpers/symbols'
import type { ModuleOptions } from './module/types'
import { IconCollector } from './Collector/Icons'
import type { Collector } from './Collector'
import { ModuleHelper } from './module/ModuleHelper'
import { ModuleContext } from './module/ModuleContext'
import { TEMPLATES } from './module/templates'
import type { TemplateDependency } from './module/templates/defineTemplate'
import { FeatureCollector } from './Collector/Features'
import { ThemeData } from './module/ThemeData'
import { BlockCollector } from './Collector/Blocks'

function onlyUnique(value: string, index: number, self: Array<string>) {
  return self.indexOf(value) === index
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'blokkli',
    configKey: 'blokkli',
    version,
    compatibility: {
      nuxt: '^3.12.0',
    },
  },
  defaults: {
    pattern: ['components/Blokkli/**/*.{js,ts,vue}'],
    globalOptions: {
      [BK_VISIBLE_LANGUAGES]: {
        type: 'checkboxes',
        label: 'Visible languages',
        options: {},
        default: [],
      },
      [BK_HIDDEN_GLOBALLY]: {
        type: 'checkbox',
        label: 'Hide globally',
        default: false,
      },
    },
    chunkNames: ['global'] as string[],
    itemEntityType: 'block',
  },
  async setup(moduleOptions, nuxt) {
    const helper = new ModuleHelper(nuxt, import.meta.url, moduleOptions)
    const iconCollector = new IconCollector(helper)
    const featureCollector = new FeatureCollector(helper)
    const blockCollector = new BlockCollector(helper)

    await iconCollector.init()
    await featureCollector.init()
    await blockCollector.init()

    const collectors: Collector[] = [
      iconCollector,
      featureCollector,
      blockCollector,
    ]

    const theme = new ThemeData(helper)

    const context = new ModuleContext(
      helper,
      iconCollector,
      featureCollector,
      blockCollector,
      theme,
    )

    TEMPLATES.forEach((template) => context.addTemplate(template))

    await context.generateTemplates()

    nuxt.options.alias['#blokkli-build'] = helper.paths.blokkliBuildDir

    // The path to the source directory of this module's consumer.
    const srcDir = nuxt.options.dir.app
    const srcResolver = createResolver(srcDir)

    const moduleDir = import.meta.url

    // The path of this module.
    const resolver = createResolver(moduleDir)

    const buildResolver = createResolver(nuxt.options.buildDir)
    const blokkliBuildDir = buildResolver.resolve('blokkli')

    // const features = extractedFeatures.filter((v) => {
    //   return v.id !== 'theme' || moduleOptions.enableThemeEditor
    // })

    // const featuresContext: AlterFeatures = {
    //   features,
    // }
    //
    // if (moduleOptions.alterFeatures) {
    //   featuresContext.features = await Promise.resolve(
    //     moduleOptions.alterFeatures(featuresContext),
    //   )
    // }
    //
    // // Create an array of all feature IDs, including onces that have been
    // // removed or added by users.
    // const allFeatureIds = [
    //   ...extractedFeatures.map((v) => v.id),
    //   ...featuresContext.features.map((v) => v.id),
    // ].filter(onlyUnique)

    function getChunkNames(): string[] {
      const chunkNames = [...(moduleOptions.chunkNames || [])]
      if (!chunkNames.includes('global')) {
        chunkNames.push('global')
      }
      return chunkNames.filter(onlyUnique)
    }

    function getFieldListTypes(): string[] {
      const types = [...(moduleOptions.fieldListTypes || [])]
      if (!types.includes('default')) {
        types.push('default')
      }
      return types.filter(onlyUnique)
    }

    const importPattern = moduleOptions.pattern || []

    if (featureCollector.isEnabled('library')) {
      importPattern.push(
        resolver.resolve('./runtime/components/Blocks/FromLibrary/*.vue'),
      )
    }

    if (featureCollector.isEnabled('fragments')) {
      importPattern.push(
        resolver.resolve('./runtime/components/Blocks/Fragment/*.vue'),
      )
    }

    // Get all files.
    const files = await resolveFiles(srcDir, importPattern, {
      followSymbolicLinks: false,
    })

    // Create extractor instance and add initial set of files.
    const blockExtractor = new BlockExtractor(
      !nuxt.options.dev,
      blokkliBuildDir,
      helper.relativePaths,
    )
    await blockExtractor.addFiles(files)

    addTemplate({
      write: true,
      filename: 'blokkli/runtime-options.ts',
      getContents: () => {
        return blockExtractor.generateRuntimeOptionsTemplate(
          moduleOptions.globalOptions,
        )
      },
      options: {
        blokkli: true,
      },
    })

    // The definitions.
    addTemplate({
      write: true,
      filename: 'blokkli/edit-components.ts',
      getContents: () => {
        return blockExtractor.generateEditComponents()
      },
      options: {
        blokkli: true,
      },
    })

    nuxt.options.runtimeConfig.public.blokkli = {
      itemEntityType: moduleOptions.itemEntityType || '',
      defaultLanguage: moduleOptions.defaultLanguage || 'en',
    }

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliField'),
      name: 'BlokkliField',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliEditable'),
      name: 'BlokkliEditable',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliProvider'),
      name: 'BlokkliProvider',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliItem'),
      name: 'BlokkliItem',
      global: true,
    })

    // Only add the vite plugin when building.
    addBuildPlugin(DefinitionPlugin(nuxt))

    // Add composables.
    addImports({
      name: 'defineBlokkli',
      from: resolver.resolve('./runtime/composables/defineBlokkli'),
      as: 'defineBlokkli',
    })
    addImports({
      name: 'defineBlokkliFragment',
      from: resolver.resolve('./runtime/composables/defineBlokkliFragment'),
      as: 'defineBlokkliFragment',
    })
    addImports({
      name: 'defineBlokkliFeature',
      from: resolver.resolve('./runtime/composables/defineBlokkliFeature'),
      as: 'defineBlokkliFeature',
    })
    addImports({
      name: 'useBlokkli',
      from: resolver.resolve('./runtime/composables/useBlokkli'),
      as: 'useBlokkli',
    })

    // The types template.
    addTemplate({
      write: true,
      filename: 'blokkli/generated-types.ts',
      getContents: () =>
        blockExtractor.generateTypesTemplate(
          moduleOptions.globalOptions || {},
          getChunkNames(),
          getFieldListTypes(),
          moduleOptions.getBundlePropsType,
        ),
      options: {
        blokkli: true,
      },
    })

    // The types template.
    addTemplate({
      write: true,
      filename: 'blokkli/default-global-options.ts',
      getContents: () =>
        blockExtractor.generateDefaultGlobalOptions(
          moduleOptions.globalOptions || {},
        ),
      options: {
        blokkli: true,
      },
    })

    let optionsSchemaTemplate: ResolvedNuxtTemplate<{
      blokkli: true
    }> | null = null

    const generateOptionsSchema = async () => {
      const outputPath = moduleOptions.schemaOptionsPath
      if (outputPath) {
        const resolvedPath = await srcResolver.resolvePath(outputPath)
        const content = blockExtractor.generateOptionsSchema(
          moduleOptions.globalOptions || {},
        )

        return fsp.writeFile(resolvedPath, content)
      }

      // Template was already generated.
      if (optionsSchemaTemplate) {
        return
      }

      // The types template.
      optionsSchemaTemplate = addTemplate({
        write: true,
        filename: 'blokkli/options-schema.json',
        getContents: () =>
          blockExtractor.generateOptionsSchema(
            moduleOptions.globalOptions || {},
          ),
        options: {
          blokkli: true,
        },
      })
    }

    await generateOptionsSchema()

    getChunkNames().forEach((chunkName) => {
      if (chunkName !== 'global' && !nuxt.options.dev) {
        addTemplate({
          write: true,
          filename: `blokkli/chunk-${chunkName}.ts`,
          getContents: () =>
            blockExtractor.generateChunkGroupTemplate(chunkName),
          options: {
            blokkli: true,
          },
        })
      }
    })

    addTemplate({
      write: true,
      filename: 'blokkli/imports.ts',
      getContents: () =>
        blockExtractor.generateImportsTemplate(
          nuxt.options.dev ? ['global'] : getChunkNames(),
        ),
      options: {
        blokkli: true,
      },
    })

    nuxt.options.alias['#blokkli/types'] = resolver.resolve('runtime/types')
    nuxt.options.alias['#blokkli/constants'] =
      resolver.resolve('runtime/constants')
    nuxt.options.alias['#blokkli/plugins'] = resolver.resolve(
      'runtime/blokkliPlugins',
    )
    nuxt.options.alias['#blokkli/components'] = resolver.resolve(
      'runtime/components/Edit',
    )
    nuxt.options.alias['#blokkli/helpers'] = resolver.resolve('runtime/helpers')
    nuxt.options.alias['#blokkli/adapter'] = resolver.resolve('runtime/adapter')
    nuxt.options.alias['#blokkli/runtime-helpers'] = resolver.resolve(
      'runtime/helpers/runtimeHelpers',
    )

    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.publicAssets ||= []
      nitroConfig.publicAssets.push({
        dir: resolver.resolve('./runtime/public'),
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    })

    addPlugin({
      src: resolver.resolve('runtime/plugins/blokkliEditable'),
    })

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
      nuxt.hook('builder:watch', async (event, filePath) => {
        const dependenciesToUpdate: TemplateDependency[] = []
        helper.fileCache.delete(filePath)

        for (const collector of collectors) {
          const result = await collector.handleWatchEvent(event, filePath)
          if (result.hasChanged) {
            dependenciesToUpdate.push(...collector.getDependencyTypes())
          }
        }

        if (dependenciesToUpdate.length) {
          await context.generateTemplates(dependenciesToUpdate)
        }

        // // Trigger HMR for the definitions file.
        // const modules = viteServer.moduleGraph.getModulesByFile(
        //   templateDefinitions.dst,
        // )
        // if (modules) {
        //   modules.forEach((v) => {
        //     viteServer.reloadModule(v)
        //   })
        // }
      })
    }
  },
})

export type { ModuleOptions }
