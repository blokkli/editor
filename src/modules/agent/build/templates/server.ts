import { defineCodeTemplate } from '../../../../../src/build/templates/defineTemplate'
import type { AgentModuleOptions } from '../types'
import type { SkillCollector } from '../SkillCollector'

export type AgentServerTemplateOptions = {
  moduleOptions: AgentModuleOptions
  providersPath: string
  skillsCollector: SkillCollector
  skillsTypesPath: string
}

/**
 * Creates a single server-only template that exports all agent server code:
 * - allowedFetchOrigins: Used by the fetch endpoint to validate allowed origins
 * - provider: The AI provider instance to use
 * - aiModel: The model to use for the AI provider
 * - skills: Array of agent skill definitions
 */
export default function (options: AgentServerTemplateOptions) {
  const { moduleOptions, providersPath, skillsCollector, skillsTypesPath } =
    options
  const { allowedFetchOrigins, provider, model } = moduleOptions

  return defineCodeTemplate(
    'agent-server',
    () => {
      const originsJson = JSON.stringify(allowedFetchOrigins, null, 2)

      // Generate the provider import using the absolute path
      const providerImport =
        provider === 'openai'
          ? `import { createOpenAIProvider } from '${providersPath}/openai'`
          : `import { createAnthropicProvider } from '${providersPath}/anthropic'`

      const providerCreate =
        provider === 'openai'
          ? 'createOpenAIProvider()'
          : 'createAnthropicProvider()'

      const modelExport = `'${model}'`

      // Generate skills imports and array
      const skills = skillsCollector.getSkills()
      let skillsCode: string

      if (skills.length === 0) {
        skillsCode = `export const skills = []`
      } else {
        const skillImports = skills.map(
          (skill) =>
            `import ${skill.importName} from '${skill.filePath.replace(/\.ts$/, '')}'`,
        )

        const skillsArrayEntries = skills.map((skill) => skill.importName)

        skillsCode = `${skillImports.join('\n')}

export const skills = [
  ${skillsArrayEntries.join(',\n  ')}
]`
      }

      return `${providerImport}

export const allowedFetchOrigins = ${originsJson}

export const provider = ${providerCreate}

export const aiModel = ${modelExport}
export const debugPrompt = ${!!moduleOptions.debugPrompt}

${skillsCode}
`
    },
    () => {
      return `import type { AIProvider } from '${providersPath}/types'
import type { SkillDefinition } from '${skillsTypesPath}'

export declare const allowedFetchOrigins: string[]
export declare const provider: AIProvider
export declare const aiModel: string
export declare const debugPrompt: boolean
export declare const skills: SkillDefinition[]
`
    },
    {
      context: 'server',
      write: true,
    },
  )
}
