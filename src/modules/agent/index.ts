import { addServerHandler, createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { AgentCollector } from './build/AgentCollector'
import createClientTemplate from './build/templates/client'
import createPromptsTemplate from './build/templates/prompts'
import createServerTemplate from './build/templates/server'
import { agentToolStripPlugin } from './build/AgentToolStripPlugin'
import type {
  AgentModuleOptions,
  AgentModuleOptionsRoutes,
} from './build/types'
import type { Plugin } from 'rollup'

const DEFAULT_ROUTES: AgentModuleOptionsRoutes = {
  agent: '/api/blokkli/agent',
  fetch: '/api/blokkli/agent/fetch',
  stream: '/api/blokkli/agent/stream',
  routing: '/api/blokkli/agent/route',
}

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
    if (!options.models?.length) {
      throw new Error(
        'Missing blökkli agent option "models". At least one model must be defined.',
      )
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
    const routes: AgentModuleOptionsRoutes = {
      ...DEFAULT_ROUTES,
      ...options.routes,
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
    ctx.helper.nuxt.options.runtimeConfig.blokkli.agent.authSecret ||= ''

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

    // Runtime packages imported by the agent client (some lazily). Registered
    // here so they are only pre-bundled when the agent module is enabled.
    ctx.helper.addPackageDependency('mammoth', 'marked', 'turndown', 'zod')

    // Additional blokkli/ directories registered by other modules.
    const moduleBlokkliDirs = ctx.helper.options.blokkliDirs || []

    // Initialize MCP tools collector with both module and project directories
    const moduleToolsDir = moduleResolver.resolve('./runtime/app/tools')
    const projectToolsDir = path.resolve(nuxt.options.rootDir, 'blokkli/tools')
    const mcpTools = new AgentCollector(ctx.helper, {
      composable: 'defineBlokkliAgentTool',
      importPrefix: 'tool',
      dependency: 'agent-mcp-tools',
      requiresName: true,
      dirs: [
        moduleToolsDir,
        projectToolsDir,
        ...moduleBlokkliDirs.map((d) => path.join(d, 'tools')),
      ],
    })
    ctx.context.addCollector(mcpTools)

    // Initialize prompts collector with both module and project directories
    const modulePromptsDir = moduleResolver.resolve('./runtime/app/prompts')
    const projectPromptsDir = path.resolve(
      nuxt.options.rootDir,
      'blokkli/prompts',
    )
    const promptsCollector = new AgentCollector(ctx.helper, {
      composable: 'defineBlokkliAgentPrompt',
      importPrefix: 'prompt',
      dependency: 'agent-prompts',
      dirs: [
        modulePromptsDir,
        projectPromptsDir,
        ...moduleBlokkliDirs.map((d) => path.join(d, 'prompts')),
      ],
    })
    ctx.context.addCollector(promptsCollector)

    // Add project tools and prompts directories to app TypeScript includes.
    ctx.helper.addAppTsInclude(projectToolsDir)
    ctx.helper.addAppTsInclude(projectPromptsDir)
    for (const dir of moduleBlokkliDirs) {
      ctx.helper.addAppTsInclude(path.join(dir, 'tools'))
    }

    // Initialize skills collector with both module and project directories
    const moduleSkillsDir = moduleResolver.resolve(
      './runtime/server/default-skills',
    )
    const projectSkillsDir = path.resolve(
      nuxt.options.rootDir,
      'blokkli/skills',
    )

    const skillsCollector = new AgentCollector(ctx.helper, {
      composable: 'defineBlokkliAgentSkill',
      importPrefix: 'skill',
      dependency: 'agent-server',
      requiresName: true,
      dirs: [
        moduleSkillsDir,
        projectSkillsDir,
        ...moduleBlokkliDirs.map((d) => path.join(d, 'skills')),
      ],
    })
    ctx.context.addCollector(skillsCollector)

    // Register the heavy client template (tools, routes, models, etc.) and
    // the lightweight prompts template (prompts + agent name only).
    // Split into two so that the outer agent feature component can import
    // prompts for dropdown registration without pulling in tools/zod/ws.
    ctx.context.addTemplate(
      createClientTemplate(mcpTools, skillsCollector, options, routes),
    )
    ctx.context.addTemplate(createPromptsTemplate(promptsCollector, options))

    // Initialize system prompt collector with both module and project directories
    const moduleSystemPromptsDir = moduleResolver.resolve(
      './runtime/server/default-system-prompts',
    )
    const projectSystemPromptsDir = path.resolve(
      nuxt.options.rootDir,
      'blokkli/system-prompts',
    )

    const systemPromptCollector = new AgentCollector(ctx.helper, {
      composable: 'defineBlokkliAgentSystemPrompt',
      importPrefix: 'systemPrompt',
      dependency: 'agent-server',
      dirs: [
        moduleSystemPromptsDir,
        projectSystemPromptsDir,
        ...moduleBlokkliDirs.map((d) => path.join(d, 'system-prompts')),
      ],
    })
    ctx.context.addCollector(systemPromptCollector)

    // Register single server template for agent config, skills, and system prompts
    ctx.context.addTemplate(
      createServerTemplate({
        moduleOptions: options,
        providersPath: moduleResolver.resolve('./runtime/server/providers'),
        sharedTypesPath: moduleResolver.resolve('./runtime/shared/types'),
        skillsCollector,
        skillsTypesPath: moduleResolver.resolve(
          './runtime/server/skills/types',
        ),
        systemPromptCollector,
        systemPromptTypesPath: moduleResolver.resolve(
          './runtime/server/system-prompts/types',
        ),
        mcpToolsCollector: mcpTools,
      }),
    )

    // Add server handler for WebSocket
    addServerHandler({
      route: routes.agent,
      handler: moduleResolver.resolve('./runtime/server/agent'),
      lazy: true,
    })

    // Add server handler for web fetch
    addServerHandler({
      route: routes.fetch,
      handler: moduleResolver.resolve('./runtime/server/fetch'),
    })

    // Add server handler for SSE streaming
    addServerHandler({
      route: routes.stream,
      handler: moduleResolver.resolve('./runtime/server/stream'),
    })

    // Add server handler for prompt routing
    addServerHandler({
      route: routes.routing,
      handler: moduleResolver.resolve('./runtime/server/route'),
    })

    // Add project skills and system-prompts directories to Nitro TypeScript includes.
    ctx.helper.addServerTsInclude(projectSkillsDir)
    ctx.helper.addServerTsInclude(projectSystemPromptsDir)

    nuxt.hook('nitro:config', (nitroConfig) => {
      // Register the agent tool strip plugin for Nitro's Rollup build.
      nitroConfig.rollupConfig ||= {}
      nitroConfig.rollupConfig.plugins ||= []
      ;(nitroConfig.rollupConfig.plugins as Plugin[]).push(
        agentToolStripPlugin(),
      )

      // Add aliases so that imports from stripped tool files resolve in Nitro.
      // The strip plugin keeps `#blokkli/agent/app/tools/schemas` imports
      // (pure Zod schemas), so they need a Nitro alias.
      nitroConfig.alias ||= {}
      nitroConfig.alias['#blokkli/agent/app/tools/schemas'] =
        moduleResolver.resolve('./runtime/app/tools/schemas')

      // Forward app aliases to Nitro for transitive dependencies
      // (e.g. chart_schemas.ts imports from #blokkli/charts/types).
      for (const [key, value] of Object.entries(nuxt.options.alias)) {
        if (key.startsWith('#blokkli/') && !nitroConfig.alias[key]) {
          nitroConfig.alias[key] = value as string
        }
      }
    })

    // Remove the WebSocket route from Nitro's type generation.
    // WebSocket handlers don't return data for $fetch, so the generated
    // types are useless and cause type errors because the server file
    // gets checked in the app context via nitro-routes.d.ts.
    nuxt.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('types:extend', (types) => {
        Reflect.deleteProperty(types.routes, routes.agent)
        Reflect.deleteProperty(types.routes, routes.fetch)
        Reflect.deleteProperty(types.routes, routes.stream)
        Reflect.deleteProperty(types.routes, routes.routing)
      })
    })
  },
})
