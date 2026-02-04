import { defineCodeTemplate } from '../../../../../src/build/templates/defineTemplate'

export type AgentProvider = 'anthropic' | 'openai'

export type AgentServerConfigOptions = {
  allowedFetchOrigins: string[]
  provider: AgentProvider
  model?: string
  /** Absolute path to the providers directory */
  providersPath: string
}

/**
 * Creates a server-only template that exports the agent configuration.
 * This includes:
 * - allowedFetchOrigins: Used by the fetch endpoint to validate allowed origins
 * - provider: The AI provider instance to use
 * - aiModel: The model to use for the AI provider
 */
export function createAgentServerConfigTemplate(
  options: AgentServerConfigOptions,
) {
  const { allowedFetchOrigins, provider, model, providersPath } = options

  return defineCodeTemplate(
    'agent-server-config',
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

      // Use provider's default model if none specified
      const modelExport = model ? `'${model}'` : 'provider.defaultModel'

      return `${providerImport}

export const allowedFetchOrigins = ${originsJson}

export const provider = ${providerCreate}

export const aiModel = ${modelExport}
`
    },
    () => {
      return `import type { AIProvider } from '${providersPath}/types'

export declare const allowedFetchOrigins: string[]
export declare const provider: AIProvider
export declare const aiModel: string
`
    },
    {
      context: 'server',
      write: true,
    },
  )
}
