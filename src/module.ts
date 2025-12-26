import { version, name } from './../package.json'
import {
  addBuildPlugin,
  addPlugin,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import { RuntimeDefinitionPlugin } from './module/unplugin/RuntimeDefinition'
import {
  BK_HIDDEN_GLOBALLY,
  BK_VISIBLE_LANGUAGES,
} from './runtime/helpers/symbols'
import type { ModuleHooks, ModuleOptions } from './module/types'
import { IconCollector } from './module/Collector/Icons'
import type { Collector } from './module/Collector'
import { ModuleHelper } from './module/ModuleHelper'
import { ModuleContext } from './module/ModuleContext'
import { TEMPLATES } from './module/templates'
import type { TemplateDependency } from './module/templates/defineTemplate'
import { FeatureCollector } from './module/Collector/Features'
import { ThemeData } from './module/ThemeData'
import { BlockCollector } from './module/Collector/Blocks'
import type { Blokkli } from './modules/defineBlokkliModule'

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
  },
  async setup(moduleOptions, nuxt) {
    const blokkliModules = moduleOptions.modules || []

    // Let modules alter the options.
    for (const module of blokkliModules) {
      if (module.init.alterOptions) {
        module.init.alterOptions(moduleOptions)
      }
    }

    const helper = new ModuleHelper(nuxt, import.meta.url, moduleOptions)

    const theme = new ThemeData(helper)

    const iconCollector = new IconCollector(helper)
    const featureCollector = new FeatureCollector(helper)
    const blockCollector = new BlockCollector(helper)

    const collectors: Collector[] = [
      iconCollector,
      featureCollector,
      blockCollector,
    ]

    await Promise.all(collectors.map((v) => v.init()))
    await Promise.all(collectors.map((v) => v.runHooks()))

    const hasErrors = collectors.flatMap((v) => v.validate()).some((v) => v)

    if (!helper.isDev && hasErrors) {
      throw new Error('Failed to build blökkli due to validation errors.')
    }

    const context = new ModuleContext(
      helper,
      iconCollector,
      featureCollector,
      blockCollector,
      theme,
    )

    const app: Blokkli = {
      helper,
      context,
    }

    // Setup blökkli modules.
    for (const module of blokkliModules) {
      await module.init.setup(app, module.options!)
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

    const moduleDir = import.meta.url

    // The path of this module.
    const resolver = createResolver(moduleDir)

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

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
      resolver.resolve('runtime/components/Edit/Features/Analyze/analyzers'),
    )
    helper.addAlias('#blokkli-build', helper.paths.blokkliBuildDir)
    helper.addAlias('#blokkli/types', resolver.resolve('runtime/types'))
    helper.addAlias('#blokkli/constants', resolver.resolve('runtime/constants'))
    helper.addAlias(
      '#blokkli/plugins',
      resolver.resolve('runtime/blokkliPlugins'),
    )
    helper.addAlias(
      '#blokkli/components',
      resolver.resolve('runtime/components/Edit'),
    )

    helper.addAlias('#blokkli/helpers', resolver.resolve('runtime/helpers'))
    helper.addAlias('#blokkli/adapter', resolver.resolve('runtime/adapter'))
    helper.addAlias(
      '#blokkli/runtime-helpers',
      resolver.resolve('runtime/helpers/runtimeHelpers'),
    )

    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.publicAssets ||= []
      nitroConfig.publicAssets.push({
        dir: resolver.resolve('./runtime/public'),
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    })

    addPlugin({
      src: resolver.resolve('runtime/plugins/blokkliDirectives'),
    })

    addBuildPlugin(RuntimeDefinitionPlugin(nuxt, 'defineBlokkli'))
    addBuildPlugin(RuntimeDefinitionPlugin(nuxt, 'defineBlokkliFragment'))
    addBuildPlugin(RuntimeDefinitionPlugin(nuxt, 'defineBlokkliProvider', 1))

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
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
            collector.validate()
            dependenciesToUpdate.push(...collector.getDependencyTypes())
          }
        }

        if (dependenciesToUpdate.length) {
          await context.generateTemplates(dependenciesToUpdate)
        }
      })
    }
  },
})

export type { ModuleOptions }

declare module '@nuxt/schema' {
  // oxlint-disable-next-line
  interface NuxtHooks extends ModuleHooks {}
}
