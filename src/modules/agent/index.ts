import { addServerHandler, createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { McpToolCollector } from './build/McpToolCollector'
import { SkillCollector } from './build/SkillCollector'
import createClientTemplate from './build/templates/client'
import createServerTemplate from './build/templates/server'
import type { AgentModuleOptions } from './build/types'

const AGENT_ROUTE = '/api/blokkli/agent'
const FETCH_ROUTE = '/api/blokkli/agent/fetch'

export default defineBlokkliModule<AgentModuleOptions>({
  alterOptions: (options) => {
    options.featureImports ||= []
    const moduleResolver = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    )
    const featurePath = moduleResolver.resolve(
      './runtime/app/features/agent/index.vue',
    )
    options.featureImports.push(featurePath)
  },
  async setup(ctx, options) {
    if (!options.model) {
      throw new Error('Missing blökkli agent option "model".')
    }
    if (!options.provider) {
      throw new Error('Missing blökkli agent option "provider".')
    }
    const nuxt = ctx.helper.nuxt
    const moduleResolver = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    )

    // @ts-expect-error Can indeed not exit, even if the types says it does.
    ctx.helper.nuxt.options.runtimeConfig.blokkli ||= {}
    // @ts-expect-error Can indeed not exit, even if the types says it does.
    ctx.helper.nuxt.options.runtimeConfig.blokkli.agent ||= {}
    ctx.helper.nuxt.options.runtimeConfig.blokkli.agent.apiKey ||= ''

    ctx.helper.addAlias(
      '#blokkli/agent/app',
      moduleResolver.resolve('./runtime/app'),
    )
    ctx.helper.addAlias(
      '#blokkli/agent/shared',
      moduleResolver.resolve('./runtime/shared'),
    )
    ctx.helper.addAlias(
      '#blokkli/agent/server',
      moduleResolver.resolve('./runtime/server'),
    )

    // Initialize MCP tools collector with both module and project directories
    const moduleToolsDir = moduleResolver.resolve('./runtime/app/tools')
    const projectToolsDir = path.resolve(nuxt.options.rootDir, 'blokkli/tools')
    const mcpTools = new McpToolCollector(ctx.helper, [
      moduleToolsDir,
      projectToolsDir,
    ])
    await mcpTools.init()
    ctx.context.addCollector(mcpTools)

    // Register client template for MCP tools
    ctx.context.addTemplate(createClientTemplate(mcpTools))

    // Add project tools directory to app TypeScript includes (client-side code)
    const relativeToolsDir = path.relative(
      nuxt.options.buildDir,
      projectToolsDir,
    )
    nuxt.options.typescript.tsConfig ||= {}
    nuxt.options.typescript.tsConfig.include ||= []
    nuxt.options.typescript.tsConfig.include.push(relativeToolsDir)

    // Initialize skills collector with both module and project directories
    const moduleSkillsDir = moduleResolver.resolve(
      './runtime/server/default-skills',
    )
    const projectSkillsDir = path.resolve(
      nuxt.options.rootDir,
      'blokkli/skills',
    )

    const skillsCollector = new SkillCollector(ctx.helper, [
      moduleSkillsDir,
      projectSkillsDir,
    ])
    await skillsCollector.init()
    ctx.context.addCollector(skillsCollector)

    // Register single server template for agent config and skills
    ctx.context.addTemplate(
      createServerTemplate({
        moduleOptions: options,
        providersPath: moduleResolver.resolve('./runtime/server/providers'),
        skillsCollector,
        skillsTypesPath: moduleResolver.resolve(
          './runtime/server/skills/types',
        ),
      }),
    )

    // Add server handler for WebSocket
    addServerHandler({
      route: AGENT_ROUTE,
      handler: moduleResolver.resolve('./runtime/server/agent'),
      lazy: true,
    })

    // Add server handler for web fetch
    addServerHandler({
      route: FETCH_ROUTE,
      handler: moduleResolver.resolve('./runtime/server/fetch'),
    })

    // Add project skills directory to Nitro TypeScript includes for proper type resolution
    // Path must be relative to .nuxt directory where tsconfig is generated
    const relativeSkillsDir = path.relative(
      nuxt.options.buildDir,
      projectSkillsDir,
    )
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.typescript ||= {}
      nitroConfig.typescript.tsConfig ||= {}
      nitroConfig.typescript.tsConfig.include ||= []
      nitroConfig.typescript.tsConfig.include.push(relativeSkillsDir)
    })

    // Remove the WebSocket route from Nitro's type generation.
    // WebSocket handlers don't return data for $fetch, so the generated
    // types are useless and cause type errors because the server file
    // gets checked in the app context via nitro-routes.d.ts.
    nuxt.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('types:extend', (types) => {
        delete types.routes[AGENT_ROUTE]
        delete types.routes[FETCH_ROUTE]
      })
    })
  },
})
