import { version, name } from './../package.json'
import {
  addBuildPlugin,
  addPlugin,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  updateTemplates,
  useLogger,
} from '@nuxt/kit'
import { resolve, join, dirname } from 'node:path'
import type { NuxtModule } from 'nuxt/schema'
import { RuntimeDefinitionPlugin } from './build/unplugin/RuntimeDefinition'
import { BlokkliEditingPlugin } from './build/unplugin/BlokkliEditing'
import { BK_HIDDEN_GLOBALLY, BK_VISIBLE_LANGUAGES } from './global/constants'
import type { ModuleOptions } from './build/types'
import { IconCollector } from './build/Collector/Icons'
import type { Collector, ModuleHooks } from './build/Collector'
import { ModuleHelper } from './build/ModuleHelper'
import { ModuleContext } from './build/ModuleContext'
import { TEMPLATES } from './build/templates'
import type { TemplateDependency } from './build/templates/defineTemplate'
import { FeatureCollector } from './build/Collector/Features'
import { ThemeData } from './build/ThemeData'
import { BlockCollector } from './build/Collector/Blocks'
import { mangleVueSFC } from './build/mangleTransform'
import type { Blokkli } from './modules/defineBlokkliModule'

const logger = useLogger('@blokkli/editor')

// The type assertion ensures that rollup-plugin-dts (used by @nuxt/module-builder)
// emits the proper NuxtModule type in dist/module.d.mts instead of falling back
// to "any" when it can't infer the return type of defineNuxtModule().
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'blokkli',
    version,
    compatibility: {
      nuxt: '>=3.15.0',
    },
  },
  defaults: {
    globalOptions: {
      [BK_VISIBLE_LANGUAGES]: {
        type: 'checkboxes',
        label: 'Visible languages',
        description: 'Only show on specific languages.',
        options: {},
        default: [],
      },
      [BK_HIDDEN_GLOBALLY]: {
        type: 'checkbox',
        label: 'Hide globally',
        description: 'Always hides the block.',
        default: false,
      },
    },
    chunkNames: ['global'],
    fromLibraryBlockBundle: 'from_library',
    fragmentBlockBundle: 'blokkli_fragment',
  },
  async setup(moduleOptions, nuxt) {
    const blokkliModules = moduleOptions.modules || []

    // Let modules alter the options.
    for (const module of blokkliModules) {
      if (module.init.alterOptions) {
        module.init.alterOptions(moduleOptions)
      }
    }

    const helper = new ModuleHelper(
      nuxt,
      logger,
      import.meta.url,
      moduleOptions,
    )

    const colorOptions = Object.entries(
      helper.options.colorOptions || {},
    ).reduce<Record<string, string>>((acc, entry) => {
      acc[entry[0]] = entry[1].hex
      return acc
    }, {})

    nuxt.options.appConfig.blokkli = {
      // @ts-expect-error The module config type defined a generic Record type, but in userland, this type will automatically contain the actual color keys as properties.
      colorOptions,
    }

    const theme = new ThemeData(helper)

    const iconCollector = new IconCollector(helper)
    const featureCollector = new FeatureCollector(helper)
    const blockCollector = new BlockCollector(helper, iconCollector)

    const collectors: Collector[] = [
      iconCollector,
      featureCollector,
      blockCollector,
    ]

    const context = new ModuleContext(
      helper,
      iconCollector,
      featureCollector,
      blockCollector,
      theme,
    )

    // When the editor is consumed against its own source (e.g. the playground
    // imports '../src/module' instead of the published package), the editor's
    // SFCs need the same `_bk_` mangling consumers get from dist via
    // scripts/mangle-dist.ts. Register runtime/ and modules/ as content paths
    // so the existing mangle Vite plugin below picks them up. Skipped when
    // running from node_modules — those SFCs are pre-mangled in dist.
    const moduleRoot = helper.resolvers.module.resolve('.')
    if (!moduleRoot.includes('/node_modules/')) {
      context.addContentPath(helper.resolvers.module.resolve('./runtime'))
      context.addContentPath(helper.resolvers.module.resolve('./modules'))
    }

    const app: Blokkli = {
      helper,
      context,
      $t: (key: string, defaultText: string) => ({
        key,
        defaultTranslation: defaultText,
      }),
    }

    // Setup blökkli modules.
    for (const module of blokkliModules) {
      await module.init.setup(app, module.options!)
    }

    // Merge collectors provided by modules.
    app.context.collectors.forEach((collector) => {
      collectors.push(collector)
    })

    await Promise.all(collectors.map((v) => v.init()))
    await Promise.all(collectors.map((v) => v.runHooks()))

    const hasErrors = [...collectors, helper]
      .flatMap((v) => v.validate(iconCollector))
      .some((v) => v)

    if (!helper.isDev && !helper.isPrepare && hasErrors) {
      throw new Error('Failed to build blökkli due to validation errors.')
    }

    TEMPLATES.forEach((v) => {
      if (typeof v === 'function') {
        const result = v(helper)
        const templates = Array.isArray(result) ? result : [result]
        templates.forEach((template) => {
          context.addTemplate(template)
        })
      } else {
        context.addTemplate(v)
      }
    })

    await context.generateTemplates()

    helper.addAlias('#blokkli-build', helper.paths.blokkliBuildDir)
    helper.inlineForNitro(helper.paths.blokkliBuildDir)

    const moduleDir = import.meta.url

    // The path of this module.
    const resolver = createResolver(moduleDir)

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    // CJS packages used by the editor need Vite pre-bundling for ESM interop.
    nuxt.options.vite.optimizeDeps ??= {}
    nuxt.options.vite.optimizeDeps.include ??= []
    nuxt.options.vite.optimizeDeps.include.push('papaparse', 'pofile')

    helper.addComponent('BlokkliField')
    helper.addComponent('BlokkliEditable')
    helper.addComponent('BlokkliProvider')
    helper.addComponent('BlokkliItem')

    helper.addComposable('defineBlokkli')
    helper.addComposable('defineBlokkliFragment')
    helper.addComposable('defineBlokkliFeature')
    helper.addComposable('defineBlokkliProvider')
    helper.addComposable('useBlokkli')
    helper.addComposable('useBlokkliHelper')

    helper.addAlias(
      '#blokkli/analyzer',
      resolver.resolve('runtime/editor/features/analyze/analyzers'),
    )
    helper.addAlias('#blokkli-build', helper.paths.blokkliBuildDir)
    helper.addAlias('#blokkli/types', resolver.resolve('runtime/types'))
    helper.addAlias('#blokkli/constants', resolver.resolve('runtime/constants'))
    helper.addAlias('#blokkli/editor', resolver.resolve('runtime/editor'))
    helper.addAlias('#blokkli/helpers', resolver.resolve('runtime/helpers'))
    helper.addAlias(
      '#blokkli/runtime-helpers',
      resolver.resolve('runtime/helpers/runtimeHelpers'),
    )

    // Add TypeScript includes for user-defined blokkli modules.
    // Node/build context (index.ts, build/) is covered transitively
    // through the import in nuxt.config.ts.
    const blokkliModulesDir = resolve(nuxt.options.rootDir, 'blokkli/modules')
    helper.addAppTsInclude(join(blokkliModulesDir, '*/app'))
    helper.addServerTsInclude(join(blokkliModulesDir, '*/server'))

    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.publicAssets ||= []
      nitroConfig.publicAssets.push({
        dir: resolver.resolve('./runtime/public'),
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    })

    addPlugin({
      src: resolver.resolve('./runtime/plugins/blokkliDirectives'),
    })

    addBuildPlugin(RuntimeDefinitionPlugin(nuxt, helper, 'defineBlokkli'))
    addBuildPlugin(
      RuntimeDefinitionPlugin(nuxt, helper, 'defineBlokkliFragment'),
    )
    addBuildPlugin(
      RuntimeDefinitionPlugin(nuxt, helper, 'defineBlokkliProvider', 1),
    )
    addBuildPlugin(BlokkliEditingPlugin(nuxt))

    // Register mangle Vite plugin for user-land module content paths.
    // This mangles template class names (_bk_ prefix) and processes <style>
    // blocks through blökkli's PostCSS pipeline for files in registered
    // content directories.
    const contentPaths = context.getContentPaths()
    if (contentPaths.length > 0) {
      const tailwindConfigPath = helper.getTailwindConfigPath()
      addVitePlugin({
        name: 'blokkli-mangle-module-classes',
        enforce: 'pre',
        async transform(code: string, id: string) {
          if (!id.endsWith('.vue')) return null
          if (!contentPaths.some((dir) => id.startsWith(dir))) return null
          const result = await mangleVueSFC(code, id, tailwindConfigPath)
          return result ? { code: result, map: null } : null
        },
        hotUpdate: {
          order: 'post' as const,
          async handler({ file, server, modules: hmrModules }) {
            if (!file.endsWith('.vue')) return
            if (!contentPaths.some((dir) => file.startsWith(dir))) return

            const environment = server.environments['client']
            if (!environment) return

            const modules = environment.moduleGraph.getModulesByFile(file)
            if (!modules || modules.size === 0) return

            // Re-transform the main module so Vue's SFC descriptor cache
            // has the mangled CSS before style sub-modules are served.
            const mainModule = [...modules].find((m) => !m.url.includes('?'))
            if (mainModule) {
              environment.moduleGraph.invalidateModule(mainModule)
              await environment.transformRequest(mainModule.url)
            }

            // Vue's handleHotUpdate compares the raw file (un-mangled)
            // against the old descriptor (mangled), so it thinks the
            // entire component changed and only returns the main module
            // for a JS update. Explicitly include style sub-modules so
            // the browser also receives a CSS update.
            const styleModules = [...modules].filter((m) =>
              m.url.includes('type=style'),
            )

            if (styleModules.length) {
              for (const styleMod of styleModules) {
                environment.moduleGraph.invalidateModule(styleMod)
              }

              const result = [...hmrModules]
              for (const styleMod of styleModules) {
                if (!result.some((m) => m.url === styleMod.url)) {
                  result.push(styleMod)
                }
              }
              return result
            }
          },
        },
      })
    }

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
      // Add module CSS directories to Nuxt's watch list so builder:watch
      // fires when these files change.
      for (const cssFile of context.getCSSFiles()) {
        nuxt.options.watch.push(dirname(cssFile))
      }

      nuxt.hook('builder:watch', async (event, providedFilePath) => {
        // In <= 3.15 this path is relative to src dir.
        const filePath = providedFilePath.startsWith('/')
          ? providedFilePath
          : helper.resolvers.src.resolve(providedFilePath)

        helper.fileCache.handleWatchEvent(event, filePath)

        const dependenciesToUpdate: TemplateDependency[] = []

        for (const collector of collectors) {
          const result = await collector.handleWatchEvent(event, filePath)
          if (result.hasChanged) {
            collector.validate(iconCollector)
            dependenciesToUpdate.push(...collector.getDependencyTypes())
          }
        }

        // Check if the changed file is a registered module CSS file
        // or a file in the same directory tree (to catch imported partials).
        const cssFiles = context.getCSSFiles()
        if (cssFiles.length > 0) {
          const cssFileDirs = cssFiles.map((f) => dirname(f))
          const isModuleCSSRelated = cssFiles.some(
            (cssFile, i) =>
              filePath === cssFile ||
              filePath.startsWith(cssFileDirs[i]! + '/'),
          )
          if (isModuleCSSRelated) {
            dependenciesToUpdate.push('module-css')
          }
        }

        if (dependenciesToUpdate.length) {
          await context.generateTemplates(dependenciesToUpdate)
          await updateTemplates()
        }
      })
    }
  },
}) as NuxtModule<ModuleOptions>

export type { ModuleOptions, ModuleHooks }
