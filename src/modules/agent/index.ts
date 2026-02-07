import { addServerHandler, createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { McpToolCollector } from './build/McpToolCollector'
import { PromptCollector } from './build/PromptCollector'
import { SkillCollector } from './build/SkillCollector'
import { SystemPromptCollector } from './build/SystemPromptCollector'
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
    if (!ctx.helper.nuxt.options.nitro?.experimental?.websocket) {
      ctx.helper.logger
        .error(`Nitro experimental WebSocket support is not enabled.

export default defineNuxtConfig({
  nitro: {
    experimental: {
      websocket: true
    }
  }
})
`)
      throw new Error('Experimental WebSocket support of Nitro is not enabled.')
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

    // Initialize prompts collector with project directory
    const projectPromptsDir = path.resolve(
      nuxt.options.rootDir,
      'blokkli/prompts',
    )
    const promptsCollector = new PromptCollector(ctx.helper, [
      projectPromptsDir,
    ])
    await promptsCollector.init()
    ctx.context.addCollector(promptsCollector)

    // Register client template for MCP tools and prompts
    ctx.context.addTemplate(
      createClientTemplate(
        mcpTools,
        promptsCollector,
        options.defaultPrompts || [],
      ),
    )

    // Add project tools directory to app TypeScript includes (client-side code)
    const relativeToolsDir = path.relative(
      nuxt.options.buildDir,
      projectToolsDir,
    )
    nuxt.options.typescript.tsConfig ||= {}
    nuxt.options.typescript.tsConfig.include ||= []
    nuxt.options.typescript.tsConfig.include.push(relativeToolsDir)

    // Add project prompts directory to app TypeScript includes (client-side code)
    const relativePromptsDir = path.relative(
      nuxt.options.buildDir,
      projectPromptsDir,
    )
    nuxt.options.typescript.tsConfig.include.push(relativePromptsDir)

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

    // Initialize system prompt collector with both module and project directories
    const moduleSystemPromptsDir = moduleResolver.resolve(
      './runtime/server/default-system-prompts',
    )
    const projectSystemPromptsDir = path.resolve(
      nuxt.options.rootDir,
      'blokkli/system-prompts',
    )

    const systemPromptCollector = new SystemPromptCollector(ctx.helper, [
      moduleSystemPromptsDir,
      projectSystemPromptsDir,
    ])
    await systemPromptCollector.init()
    ctx.context.addCollector(systemPromptCollector)

    // Register single server template for agent config, skills, and system prompts
    ctx.context.addTemplate(
      createServerTemplate({
        moduleOptions: options,
        providersPath: moduleResolver.resolve('./runtime/server/providers'),
        skillsCollector,
        skillsTypesPath: moduleResolver.resolve(
          './runtime/server/skills/types',
        ),
        systemPromptCollector,
        systemPromptTypesPath: moduleResolver.resolve(
          './runtime/server/system-prompts/types',
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

    // Add project skills and system-prompts directories to Nitro TypeScript includes for proper type resolution
    // Path must be relative to .nuxt directory where tsconfig is generated
    const relativeSkillsDir = path.relative(
      nuxt.options.buildDir,
      projectSkillsDir,
    )
    const relativeSystemPromptsDir = path.relative(
      nuxt.options.buildDir,
      projectSystemPromptsDir,
    )
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.typescript ||= {}
      nitroConfig.typescript.tsConfig ||= {}
      nitroConfig.typescript.tsConfig.include ||= []
      nitroConfig.typescript.tsConfig.include.push(relativeSkillsDir)
      nitroConfig.typescript.tsConfig.include.push(relativeSystemPromptsDir)
    })

    // Remove the WebSocket route from Nitro's type generation.
    // WebSocket handlers don't return data for $fetch, so the generated
    // types are useless and cause type errors because the server file
    // gets checked in the app context via nitro-routes.d.ts.
    nuxt.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('types:extend', (types) => {
        Reflect.deleteProperty(types.routes, AGENT_ROUTE)
        Reflect.deleteProperty(types.routes, FETCH_ROUTE)
      })
    })
  },
})
