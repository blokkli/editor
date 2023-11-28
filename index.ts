import {
  addBuildPlugin,
  addComponent,
  addImports,
  addTemplate,
  createResolver,
  defineNuxtModule,
  resolveFiles,
  updateTemplates,
} from '@nuxt/kit'
import Extractor from './Extractor'
import { extname, basename } from 'path'
import { ParagraphDefinitionOptionsInput } from './runtime/types'
import { onlyUnique } from './runtime/helpers'
import postcss from 'postcss'
import { promises as fsp, existsSync } from 'fs'
import postcssImport from 'postcss-import'
import postcssUrl from 'postcss-url'
import tailwindNesting from 'tailwindcss/nesting'
import tailwindcss from 'tailwindcss'
import tailwindConfig from './css/tailwind.config'
import { ParagraphsBuilderPlugin } from './vitePlugin'

export const fileExists = (
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

async function buildStyles(sourceFile: string, sourceFolder: string) {
  const css = await fsp.readFile(sourceFile).then((v) => v.toString())
  const processed = await postcss([
    postcssImport,
    tailwindNesting,
    tailwindcss({
      ...tailwindConfig,
      content: [sourceFolder + '/**/*.{vue,js,ts}'],
    }),
    postcssUrl,
  ])
    .process(css, { from: sourceFile })
    .then((result) => {
      return result.css
    })
    .catch((e) => {
      console.log(e)
      throw new Error('Failed to compile nuxt-paragraphs-builder CSS.')
    })
  return processed
}

/**
 * Since we have to parse JavaScript in order to figure out the arguments, we
 * can one allow JS-like file extensions.
 */
const POSSIBLE_EXTENSIONS = ['.js', '.ts', '.vue', '.mjs']

/**
 * Options for the vue-paragraphs-builder module.
 */
export type ModuleOptions = {
  /**
   * The pattern of source files to scan for paragraph components.
   */
  pattern?: string[]

  globalOptions?: ParagraphDefinitionOptionsInput

  /**
   * Define available chunk groups.
   *
   * The idea of this feature is to split rarely used paragraphs into separate
   * chunks, so that they are not imported on each page.
   *
   * This value should only be set if the paragraph is actually used rarely.
   * Having too many chunks has the opposite effect, as rendering a page
   * requires multiple requests.
   *
   * If left empty, the paragraph is bundled in a default chunk, which should
   * contain paragraphs that are used for most pages.
   */
  chunkNames?: string[]

  /**
   * Valid paragraphs field list types.
   *
   * If one or more values are defined, they can be passed to the PbField
   * component as a prop. The value is made available to all paragraphs inside
   * this field.
   */
  fieldListTypes?: string[]

  disableFeatures?: {
    library?: boolean
  }

  /**
   * The langcode that doesn't use a URL prefix.
   *
   * This is used to build paths for iframes.
   */
  langcodeWithoutPrefix?: string

  /**
   * If provided, the grid feature is enabled and the markup is used to display the grid.
   */
  gridMarkup?: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-paragraphs-builder',
    configKey: 'paragraphsBuilder',
    compatibility: {
      nuxt: '^3.4.0',
    },
  },
  defaults: {
    pattern: ['components/Paragraph/**/*.{js,ts,vue}'],
    globalOptions: {} as ParagraphDefinitionOptionsInput,
    chunkNames: ['global'] as string[],
  },
  async setup(moduleOptions, nuxt) {
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

    nuxt.options.runtimeConfig.public.paragraphsBuilder = {
      disableLibrary: !!moduleOptions.disableFeatures?.library,
      langcodeWithoutPrefix: moduleOptions.langcodeWithoutPrefix,
      gridMarkup: moduleOptions.gridMarkup,
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
        import type { PbAdapterFactory } from '#blokkli/adapter'
        import adapter from '${resolvedPath}'

        export default adapter as PbAdapterFactory<any>
        `,
      })
    })()

    nuxt.options.alias['#blokkli/compiled-edit-adapter'] = adapterTemplate.dst

    // The path to the source directory of this module's consumer.
    const srcDir = nuxt.options.srcDir
    const srcResolver = createResolver(srcDir)

    // The path of this module.
    const resolver = createResolver(import.meta.url)

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    addComponent({
      filePath: resolver.resolve('./runtime/components/FieldParagraphs.vue'),
      name: 'PbField',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/Provider.vue'),
      name: 'PbProvider',
      global: true,
    })

    addComponent({
      filePath: resolver.resolve('./runtime/components/ParagraphItem.vue'),
      name: 'PbItem',
      global: true,
    })

    // Only add the vite plugin when building.
    addBuildPlugin(ParagraphsBuilderPlugin(nuxt))

    // Add composables.
    addImports({
      name: 'defineParagraph',
      from: resolver.resolve('./runtime/composables/defineParagraph'),
      as: 'defineParagraph',
    })
    addImports({
      name: 'useParagraphsBuilderStore',
      from: resolver.resolve('./runtime/composables/useParagraphsBuilderStore'),
      as: 'useParagraphsBuilderStore',
    })
    addImports({
      name: 'useParagraphsBuilderEditContext',
      as: 'useParagraphsBuilderEditContext',
      from: resolver.resolve(
        './runtime/composables/useParagraphsBuilderEditContext',
      ),
    })
    const templateStyles = addTemplate({
      write: true,
      filename: 'paragraphs-builder/edit.css',
      getContents: () => {
        console.log('Building nuxt-paragraphs-builder CSS...')
        const sourceFile = resolver.resolve('css/index.css')
        const sourceFolder = resolver.resolve('runtime')
        return buildStyles(sourceFile, sourceFolder)
      },
      options: {
        paragraphsBuilderStyle: true,
      },
    })

    // The types template.
    nuxt.options.alias['#nuxt-paragraphs-builder/styles'] = templateStyles.dst

    // Get all files.
    const files = await resolveFiles(srcDir, moduleOptions.pattern || [], {
      followSymbolicLinks: false,
    })

    // Create extractor instance and add initial set of files.
    const extractor = new Extractor(!nuxt.options.dev)
    await extractor.addFiles(files)

    // The definitions.
    const templateDefinitions = addTemplate({
      write: true,
      filename: 'paragraphs-builder/definitions.ts',
      getContents: () => {
        return extractor.generateDefinitionTemplate(moduleOptions.globalOptions)
      },
      options: {
        paragraphsBuilder: true,
      },
    })
    nuxt.options.alias['#nuxt-paragraphs-builder/definitions'] =
      templateDefinitions.dst

    // The types template.
    const templateGeneratedTypes = addTemplate({
      write: true,
      filename: 'paragraphs-builder/generated-types.ts',
      getContents: () => {
        return extractor.generateTypesTemplate(
          Object.keys(moduleOptions.globalOptions || {}),
          getChunkNames(),
          getFieldListTypes(),
        )
      },
      options: {
        paragraphsBuilder: true,
      },
    })
    nuxt.options.alias['#nuxt-paragraphs-builder/generated-types'] =
      templateGeneratedTypes.dst

    // The types template.
    const templateDefaultGlobalOptions = addTemplate({
      write: true,
      filename: 'paragraphs-builder/default-global-options.ts',
      getContents: () => {
        return extractor.generateDefaultGlobalOptions(
          moduleOptions.globalOptions || {},
        )
      },
      options: {
        paragraphsBuilder: true,
      },
    })
    nuxt.options.alias['#nuxt-paragraphs-builder/default-global-options'] =
      templateDefaultGlobalOptions.dst

    getChunkNames().forEach((chunkName) => {
      if (chunkName !== 'global') {
        const template = addTemplate({
          write: true,
          filename: `paragraphs-builder/chunk-${chunkName}.ts`,
          getContents: () => {
            return extractor.generateChunkGroup(chunkName, true)
          },
          options: {
            paragraphsBuilder: true,
          },
        })
        nuxt.options.alias['#nuxt-paragraphs-builder/chunk-' + chunkName] =
          template.dst
      }
    })

    const templateImports = addTemplate({
      write: true,
      filename: 'paragraphs-builder/imports.ts',
      getContents: () => {
        return extractor.generateImportsTemplate(getChunkNames())
      },
      options: {
        paragraphsBuilder: true,
      },
    })

    const templateIcons = addTemplate({
      write: true,
      filename: 'paragraphs-builder/icons.ts',
      getContents: async () => {
        const path = resolver.resolve('./icons')
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
export type PbIcon = keyof typeof icons`
      },
      options: {
        paragraphsBuilder: true,
      },
    })
    nuxt.options.alias['#pb/icons'] = templateIcons.dst

    nuxt.options.alias['#nuxt-paragraphs-builder/imports'] = templateImports.dst

    nuxt.options.alias['#pb/types'] = resolver.resolve('runtime/types')

    nuxt.options.alias['#pb/plugins'] = resolver.resolve('runtime/plugins')
    nuxt.options.alias['#pb/components'] = resolver.resolve(
      'runtime/components/Edit',
    )
    nuxt.options.alias['#pb/helpers'] = resolver.resolve('runtime/helpers')
    nuxt.options.alias['#pb/sortable'] = resolver.resolve('runtime/sortable')

    nuxt.options.alias['#blokkli/adapter'] = resolver.resolve('runtime/adapter')

    // Checks if the given file path is handled by this module.
    const applies = (path: string): Promise<string | undefined | void> => {
      const filePath = srcResolver.resolve(path)

      // Check that only the globally possible file types are used.
      if (!POSSIBLE_EXTENSIONS.includes(extname(filePath))) {
        return Promise.resolve()
      }

      // Get all files based on pattern and check if there is a match.
      return resolveFiles(srcDir, moduleOptions.pattern!, {
        followSymbolicLinks: false,
      }).then((files) => {
        return files.find((v) => v === filePath)
      })
    }

    const appliesStyles = (path: string): boolean => {
      return path.includes('nuxt-paragraphs-builder/css')
    }

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
      nuxt.hook('vite:serverCreated', (viteServer) => {
        nuxt.hook('builder:watch', async (_event, path) => {
          if (appliesStyles(path)) {
            await updateTemplates({
              filter: (template) => {
                return (
                  template.options && template.options.paragraphsBuilderStyle
                )
              },
            })
            const modules = viteServer.moduleGraph.getModulesByFile(
              templateStyles.dst,
            )
            if (modules) {
              modules.forEach((v) => {
                viteServer.reloadModule(v)
              })
            }
          }
          const filePath = await applies(path)
          if (!filePath) {
            return
          }
          // Determine if the file has changed.
          const hasChanged = await extractor.handleFile(filePath)

          // Nothing to do.
          if (!hasChanged) {
            return
          }

          await updateTemplates({
            filter: (template) => {
              return template.options && template.options.paragraphsBuilder
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
