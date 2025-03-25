import { version } from './../package.json'
import {
  addBuildPlugin,
  addPlugin,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
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

    const context = new ModuleContext(
      helper,
      iconCollector,
      featureCollector,
      blockCollector,
      theme,
    )

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

    nuxt.options.alias['#blokkli-build'] = helper.paths.blokkliBuildDir

    const moduleDir = import.meta.url

    // The path of this module.
    const resolver = createResolver(moduleDir)

    nuxt.options.runtimeConfig.public.blokkli = {
      itemEntityType: moduleOptions.itemEntityType || '',
      defaultLanguage: moduleOptions.defaultLanguage || 'en',
    }

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    helper.addComponent('BlokkliField')
    helper.addComponent('BlokkliEditable')
    helper.addComponent('BlokkliProvider')
    helper.addComponent('BlokkliItem')

    helper.addComposable('defineBlokkli')
    helper.addComposable('defineBlokkliFragment')
    helper.addComposable('defineBlokkliFeature')
    helper.addComposable('useBlokkli')

    addBuildPlugin(DefinitionPlugin(nuxt))
    // addBuildPlugin(DefinitionsPlugin(), {
    //   prepend: true,
    // })

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
