import type { StreamTemplateDefinition } from './types'

/**
 * Define a stream template.
 *
 * Templates provide the system prompt and user message for the streaming
 * sub-agent that performs text rewrites. The optional `defaultInstructions`
 * field is appended to the system prompt only when no skill provides
 * context for this template.
 *
 * @example
 * ```ts
 * export default defineStreamTemplate<{ instruction: string }>({
 *   name: 'rewrite',
 *   build: (params, fields) => ({
 *     systemPrompt: `You are a text editing assistant.\n\n${buildOutputFormatBlock(fields)}`,
 *     userMessage: params.instruction,
 *   }),
 * })
 * ```
 */
export function defineStreamTemplate<TParams>(
  definition: StreamTemplateDefinition<TParams>,
): StreamTemplateDefinition<TParams> {
  return definition
}
