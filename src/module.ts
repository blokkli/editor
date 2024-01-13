import {
  addBuildPlugin,
  addComponent,
  addImports,
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  resolveFiles,
  updateTemplates,
} from '@nuxt/kit'
import BlockExtractor from './Extractor/BlockExtractor'
import FeatureExtractor, {
  type ExtractedFeatureDefinition,
} from './Extractor/FeatureExtractor'
import { extname, basename } from 'path'
import type { BlockDefinitionOptionsInput } from './runtime/types'
import { promises as fsp, existsSync } from 'fs'
import { DefinitionPlugin } from './vitePlugin'
import defu from 'defu'
import defaultTranslations from './translations'

function onlyUnique(value: string, index: number, self: Array<string>) {
  return self.indexOf(value) === index
}

const fileExists = (
  path?: string,
  extensions = ['js', 'ts'],
): string | null => {
  if (!path) {
    return null
  } else if (existsSync(path)) {
    // If path already contains/forces the extension
    return path
  }

  const extension = extensions.find((extension) =>
    existsSync(`${path}.${extension}`),
  )

  return extension ? `${path}.${extension}` : null
}

/**
 * Since we have to parse JavaScript in order to figure out the arguments, we
 * can one allow JS-like file extensions.
 */
const POSSIBLE_EXTENSIONS = ['.js', '.ts', '.vue', '.mjs']

type AlterFeatures = {
  features: ExtractedFeatureDefinition[]
}

/**
 * Options for the module.
 */
export type ModuleOptions = {
  /**
   * The pattern of source files to scan for blokkli components.
   */
  pattern?: string[]

  /**
   * The name of the composable to define a blokkli component.
   */
  composableName?: string

  /**
   * Define reusable options that can be used in blokkli item components by
   * referencing the option name.
   */
  globalOptions?: BlockDefinitionOptionsInput

  /**
   * Define available chunk groups.
   *
   * The idea of this feature is to split rarely used components into separate
   * chunks, so that they are not imported on each page.
   *
   * This value should only be set if the component is actually used rarely.
   * Having too many chunks has the opposite effect, as rendering a page
   * requires multiple requests.
   *
   * If left empty, all components is bundled in a default chunk, which should
   * contain components that are used for most pages.
   */
  chunkNames?: string[]

  /**
   * Valid field list types.
   *
   * If one or more values are defined, they can be passed to the BlokkliField
   * component as a prop. The value is made available to all blokkli items inside
   * this field.
   */
  fieldListTypes?: string[]

  /**
   * The langcode that doesn't use a URL prefix.
   *
   * This is used to build paths for iframes.
   */
  langcodeWithoutPrefix?: string

  /**
   * The entity type of blokkli items.
   *
   * Using the paragraphs_builder integration this value should be set to "paragraph".
   */
  itemEntityType?: string

  /**
   * Provide overrides for the translations.
   */
  translations?: Record<string, Record<string, string>>

  /**
   * The default/fallback language for the editor.
   */
  defaultLanguage?: string

  /**
   * Alter features by removing or adding new ones.
   *
   * It's also possible to override builtin feature components with custom
   * implementations.
   */
  alterFeatures?: (
    ctx: AlterFeatures,
  ) => Promise<ExtractedFeatureDefinition[]> | ExtractedFeatureDefinition[]
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'blokkli',
    configKey: 'blokkli',
    compatibility: {
      nuxt: '^3.4.0',
    },
  },
  defaults: {
    pattern: ['components/Blokkli/**/*.{js,ts,vue}'],
    globalOptions: {} as BlockDefinitionOptionsInput,
    chunkNames: ['global'] as string[],
    composableName: 'defineBlokkli',
    itemEntityType: 'blokkli_item',
  },
  async setup(moduleOptions, nuxt) {
    // The path to the source directory of this module's consumer.
    const srcDir = nuxt.options.srcDir
    const srcResolver = createResolver(srcDir)

    const moduleDir = import.meta.url

    // The path of this module.
    const resolver = createResolver(moduleDir)

    const featureFolder = resolver.resolve('./runtime/components/Edit/Features')
    const featureExtractor = new FeatureExtractor(!nuxt.options.dev)
    const features: ExtractedFeatureDefinition[] = await resolveFiles(
      featureFolder,
      ['*/index.vue'],
      {
        followSymbolicLinks: false,
      },
    ).then(async (files) => {
      await featureExtractor.addFiles(files)
      return featureExtractor.getFeatures()
    })

    const featuresContext: AlterFeatures = {
      features,
    }

    if (moduleOptions.alterFeatures) {
      featuresContext.features = await Promise.resolve(
        moduleOptions.alterFeatures(featuresContext),
      )
    }

    // The custom feature components.
    const featureComponents = addTemplate({
      write: true,
      filename: 'blokkli/features.ts',
      getContents: async () => {
        const features = featuresContext.features.map((v) => {
          const importName = `Feature_${v.componentName}`
          return {
            id: v.id,
            componentName: v.componentPath,
            importName,
            importStatement: `import ${importName} from '${v.componentPath}'`,
            definition: v.definition,
          }
        })

        const imports = features
          .map((v) => {
            return v.importStatement
          })
          .join('\n')

        const availableFeaturesAtBuild = featuresContext.features.map(
          (v) => v.id,
        )

        const featuresArray = features
          .map((v) => {
            return `{ id: "${v.id}", dependencies: ${JSON.stringify(
              v.definition.dependencies || [],
            )}, viewports: ${JSON.stringify(
              v.definition.viewports || [],
            )}, component: ${
              v.importName
            }, requiredAdapterMethods: ${JSON.stringify(
              v.definition.requiredAdapterMethods || [],
            )}, label: ${JSON.stringify(
              v.definition.label || '',
            )}, description: "${v.definition.description || ''}" }`
          })
          .join(',\n')

        return `${imports}
import type { BlokkliAdapter } from '#blokkli/adapter'
import type { Viewport } from '#blokkli/constants'
type AdapterMethods = keyof BlokkliAdapter<any>

export const availableFeaturesAtBuild = ${JSON.stringify(
          availableFeaturesAtBuild,
        )} as const

export type ValidFeatureKey = typeof availableFeaturesAtBuild[number]

type FeatureComponent = {
  id: string
  component: any
  requiredAdapterMethods: AdapterMethods[]
  dependencies: ValidFeatureKey[]
  description: string
  label: string
  viewports: Viewport[]
}

export const featureComponents: FeatureComponent[] = [
${featuresArray}
]
`
      },
      options: {
        blokkli: true,
      },
    })
    nuxt.options.alias['#blokkli-runtime/features'] = featureComponents.dst

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

    const libraryEnabled = featuresContext.features.some(
      (v) => v.id === 'library',
    )

    // Add the from_library blokkli item.
    if (libraryEnabled) {
      importPattern.push(
        resolver.resolve('./runtime/components/FromLibrary/*.vue'),
      )
    }

    // Get all files.
    const files = await resolveFiles(srcDir, importPattern, {
      followSymbolicLinks: false,
    })

    // Create extractor instance and add initial set of files.
    const blockExtractor = new BlockExtractor(
      !nuxt.options.dev,
      moduleOptions.composableName!,
    )
    await blockExtractor.addFiles(files)

    // The definitions.
    const templateDefinitions = addTemplate({
      write: true,
      filename: 'blokkli/definitions.ts',
      getContents: () => {
        return blockExtractor.generateDefinitionTemplate(
          moduleOptions.globalOptions,
        )
      },
      options: {
        blokkli: true,
      },
    })
    nuxt.options.alias['#blokkli/definitions'] = templateDefinitions.dst

    // The definitions.
    const templateTranslations = addTemplate({
      write: true,
      filename: 'blokkli/translations.ts',
      getContents: () => {
        const translations: Record<string, Record<string, string>> = {}
        Object.keys(defaultTranslations).forEach((language) => {
          translations[language] = {}
          Object.keys((defaultTranslations as any)[language]).forEach((key) => {
            translations[language][key] = (defaultTranslations as any)[
              language
            ][key].translation
          })
        })
        const merged = defu(translations, moduleOptions.translations)
        return `export const translations = ${JSON.stringify(merged, null, 2)}`
      },
      options: {
        blokkli: true,
      },
    })
    nuxt.options.alias['#blokkli/translations'] = templateTranslations.dst

    nuxt.options.runtimeConfig.public.blokkli = {
      langcodeWithoutPrefix: moduleOptions.langcodeWithoutPrefix || '',
      itemEntityType: moduleOptions.itemEntityType || '',
      defaultLanguage: moduleOptions.defaultLanguage || 'en',
    }

    // Setup adapter.
    const resolvedPath = '~/app/blokkli.editAdapter'
      .replace(/^(~~|@@)/, nuxt.options.rootDir)
      .replace(/^(~|@)/, nuxt.options.srcDir)
    // nuxt.options.build.transpile.push(resolvedPath)
    const adapterTemplate = (() => {
      const resolvedFilename = `blokkli.editAdapter.ts`

      const maybeUserFile = fileExists(resolvedPath, ['ts'])

      if (!maybeUserFile) {
        throw new Error(
          'Missing blokkli adapter file in ~/app/blokkli.editAdapter.ts',
        )
      }
      return addTemplate({
        filename: resolvedFilename,
        write: true,
        getContents: () => `
        import type { BlokkliAdapterFactory } from '#blokkli/adapter'
        import adapter from '${resolvedPath}'

        export default adapter as BlokkliAdapterFactory<any>
        `,
      })
    })()

    nuxt.options.alias['#blokkli/compiled-edit-adapter'] = adapterTemplate.dst

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliField.vue'),
      name: 'BlokkliField',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliEditable.vue'),
      name: 'BlokkliEditable',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliProvider.vue'),
      name: 'BlokkliProvider',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/BlokkliItem.vue'),
      name: 'BlokkliItem',
      global: true,
    })

    // Only add the vite plugin when building.
    addBuildPlugin(DefinitionPlugin(nuxt, moduleOptions.composableName!))

    // Add composables.
    addImports({
      name: 'defineBlokkli',
      from: resolver.resolve('./runtime/composables/defineBlokkli'),
      as: moduleOptions.composableName,
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
    nuxt.options.alias['#blokkli/styles'] = resolver.resolve(
      './runtime/css/output.css',
    )

    // The types template.
    const templateGeneratedTypes = addTemplate({
      write: true,
      filename: 'blokkli/generated-types.ts',
      getContents: () => {
        return blockExtractor.generateTypesTemplate(
          moduleOptions.globalOptions || {},
          getChunkNames(),
          getFieldListTypes(),
        )
      },
      options: {
        blokkli: true,
      },
    })
    nuxt.options.alias['#blokkli/generated-types'] = templateGeneratedTypes.dst

    // The types template.
    const templateDefaultGlobalOptions = addTemplate({
      write: true,
      filename: 'blokkli/default-global-options.ts',
      getContents: () => {
        return blockExtractor.generateDefaultGlobalOptions(
          moduleOptions.globalOptions || {},
        )
      },
      options: {
        blokkli: true,
      },
    })
    nuxt.options.alias['#blokkli/default-global-options'] =
      templateDefaultGlobalOptions.dst

    getChunkNames().forEach((chunkName) => {
      if (chunkName !== 'global') {
        const template = addTemplate({
          write: true,
          filename: `blokkli/chunk-${chunkName}.ts`,
          getContents: () => {
            return blockExtractor.generateChunkGroup(chunkName, true)
          },
          options: {
            blokkli: true,
          },
        })
        nuxt.options.alias['#blokkli/chunk-' + chunkName] = template.dst
      }
    })

    const templateImports = addTemplate({
      write: true,
      filename: 'blokkli/imports.ts',
      getContents: () => {
        return blockExtractor.generateImportsTemplate(getChunkNames())
      },
      options: {
        blokkli: true,
      },
    })

    const templateIcons = addTemplate({
      write: true,
      filename: 'blokkli/icons.ts',
      getContents: async () => {
        const path = resolver.resolve('./runtime/icons')
        const files = await resolveFiles(path, '*.svg')
        const icons = await Promise.all(
          files.map((filePath) => {
            return fsp.readFile(filePath).then((data) => {
              const name = basename(filePath, '.svg').toLowerCase()
              return {
                markup: data.toString(),
                name,
              }
            })
          }),
        )

        const iconMap = icons.reduce<Record<string, string>>((acc, v) => {
          acc[v.name] = v.markup
          return acc
        }, {})

        return `export const icons = ${JSON.stringify(iconMap)} as const
export type BlokkliIcon = keyof typeof icons`
      },
      options: {
        blokkli: true,
      },
    })
    nuxt.options.alias['#blokkli/icons'] = templateIcons.dst
    nuxt.options.alias['#blokkli/imports'] = templateImports.dst
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

    nuxt.hook('nitro:config', async (nitroConfig) => {
      nitroConfig.publicAssets ||= []
      nitroConfig.publicAssets.push({
        dir: resolver.resolve('./runtime/public'),
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    })

    addPlugin({
      src: resolver.resolve('runtime/plugins/blokkliEditable'),
    })

    // Checks if the given file path is handled by this module.
    const applies = (path: string): Promise<string | undefined | void> => {
      const filePath = srcResolver.resolve(path)

      // Check that only the globally possible file types are used.
      if (!POSSIBLE_EXTENSIONS.includes(extname(filePath))) {
        return Promise.resolve()
      }

      // Get all files based on pattern and check if there is a match.
      return resolveFiles(srcDir, importPattern, {
        followSymbolicLinks: false,
      }).then((files) => {
        return files.find((v) => v === filePath)
      })
    }

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
      nuxt.hook('vite:serverCreated', (viteServer) => {
        nuxt.hook('builder:watch', async (_event, path) => {
          const filePath = await applies(path)
          if (!filePath) {
            return
          }
          // Determine if the file has changed.
          const hasChanged = await blockExtractor.handleFile(filePath)

          // Nothing to do.
          if (!hasChanged) {
            return
          }

          await updateTemplates({
            filter: (template) => {
              return template.options && template.options.blokkli
            },
          })

          // Trigger HMR for the definitions file.
          const modules = viteServer.moduleGraph.getModulesByFile(
            templateDefinitions.dst,
          )
          if (modules) {
            modules.forEach((v) => {
              viteServer.reloadModule(v)
            })
          }
        })
      })
    }
  },
})
