import { defineCodeTemplate } from '../../../../../src/build/templates/defineTemplate'
import type { AgentModuleOptions } from '../types'
import type { AgentCollector } from '../AgentCollector'

export type AgentServerTemplateOptions = {
  moduleOptions: AgentModuleOptions
  providersPath: string
  sharedTypesPath: string
  skillsCollector: AgentCollector
  skillsTypesPath: string
  systemPromptCollector: AgentCollector
  systemPromptTypesPath: string
}

/**
 * Creates a single server-only template that exports all agent server code:
 * - allowedFetchOrigins: Used by the fetch endpoint to validate allowed origins
 * - provider: The AI provider instance to use
 * - models: Array of model definitions with optional pricing
 * - skills: Array of agent skill definitions
 * - systemPrompts: Array of agent system prompt definitions
 */
export default function (options: AgentServerTemplateOptions) {
  const {
    moduleOptions,
    providersPath,
    sharedTypesPath,
    skillsCollector,
    skillsTypesPath,
    systemPromptCollector,
    systemPromptTypesPath,
  } = options
  const { allowedFetchOrigins, provider, models } = moduleOptions

  return defineCodeTemplate(
    'agent-server',
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.ts$/, '')
      const imports: string[] = []

      // Provider import
      if (provider === 'openai') {
        imports.push(
          `import { createOpenAIProvider } from '${rel(providersPath)}/openai'`,
        )
      } else {
        imports.push(
          `import { createAnthropicProvider } from '${rel(providersPath)}/anthropic'`,
        )
      }

      const providerCreate =
        provider === 'openai'
          ? 'createOpenAIProvider()'
          : 'createAnthropicProvider()'

      // Skills imports and export
      const skills = skillsCollector.getItems()
      for (const skill of skills) {
        imports.push(`import ${skill.importName} from '${rel(skill.filePath)}'`)
      }

      const skillsExport =
        skills.length === 0
          ? `export const skills = []`
          : `export const skills = [\n  ${skills.map((s) => s.importName).join(',\n  ')}\n]`

      // System prompts imports and export
      const systemPrompts = systemPromptCollector.getItems()
      for (const sp of systemPrompts) {
        imports.push(`import ${sp.importName} from '${rel(sp.filePath)}'`)
      }

      const systemPromptsExport =
        systemPrompts.length === 0
          ? `export const systemPrompts = []`
          : `export const systemPrompts = [\n  ${systemPrompts.map((sp) => sp.importName).join(',\n  ')}\n]`

      const originsJson = JSON.stringify(allowedFetchOrigins, null, 2)

      return `${imports.join('\n')}

export const allowedFetchOrigins = ${originsJson}

export const provider = ${providerCreate}

export const models = ${JSON.stringify(models)}
export const debugPrompt = ${!!moduleOptions.debugPrompt}

${skillsExport}

${systemPromptsExport}
`
    },
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.ts$/, '')

      return `import type { AIProvider } from '${rel(providersPath)}/types'
import type { SkillDefinition } from '${rel(skillsTypesPath)}'
import type { SystemPromptDefinition } from '${rel(systemPromptTypesPath)}'
import type { AgentModelDefinition } from '${rel(sharedTypesPath)}'

export const allowedFetchOrigins: string[]
export const provider: AIProvider
export const models: AgentModelDefinition[]
export const debugPrompt: boolean
export const skills: SkillDefinition[]
export const systemPrompts: SystemPromptDefinition[]
`
    },
    {
      context: 'server',
      write: true,
    },
  )
}
