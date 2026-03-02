import { addServerHandler, createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { AgentCollector } from './build/AgentCollector'
import createClientTemplate from './build/templates/client'
import createServerTemplate from './build/templates/server'
import { agentToolStripPlugin } from './build/AgentToolStripPlugin'
import type { AgentModuleOptions, AgentModuleOptionsRoutes } from './build/types'
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

    // Additional blokkli/ directories registered by other modules.
    const moduleBlokkliDirs = ctx.helper.options.blokkliDirs || []

    // Initialize MCP tools collector with both module and project directories
    const moduleToolsDir = moduleResolver.resolve('./runtime/app/tools')
    const projectToolsDir = path.resolve(nuxt.options.rootDir, 'blokkli/tools')
    const mcpTools = new AgentCollector(ctx.helper, {
      composable: 'defineBlokkliAgentTool',
      importPrefix: 'tool',
      dependency: 'agent-mcp-tools',
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

    // Add module blokkli tools directories to app TypeScript includes
    for (const dir of moduleBlokkliDirs) {
      const toolsDir = path.join(dir, 'tools')
      const relDir = path.relative(nuxt.options.buildDir, toolsDir)
      nuxt.options.typescript.tsConfig.include.push(relDir)
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
      dirs: [
        moduleSkillsDir,
        projectSkillsDir,
        ...moduleBlokkliDirs.map((d) => path.join(d, 'skills')),
      ],
    })
    ctx.context.addCollector(skillsCollector)

    // Register client template for MCP tools, prompts, and skills
    ctx.context.addTemplate(
      createClientTemplate(
        mcpTools,
        promptsCollector,
        skillsCollector,
        options,
        routes,
      ),
    )

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
