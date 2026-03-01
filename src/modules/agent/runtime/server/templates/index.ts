import type { FieldInput, StreamTemplateDefinition } from './types'
import fixReadability from './definitions/fixReadability'
import translate from './definitions/translate'
import rewrite from './definitions/rewrite'
import generateContent from './definitions/generateContent'

export { defineStreamTemplate } from './defineStreamTemplate'
export { buildOutputFormatBlock } from './utils'
export type {
  FieldInput,
  TemplateResult,
  StreamTemplateDefinition,
} from './types'

type FixReadabilityParams = Parameters<(typeof fixReadability)['build']>[0]
type TranslateParams = Parameters<(typeof translate)['build']>[0]
type RewriteParams = Parameters<(typeof rewrite)['build']>[0]
type GenerateContentParams = Parameters<(typeof generateContent)['build']>[0]

export type TemplateCall =
  | { template: 'fix_readability'; templateParams: FixReadabilityParams }
  | { template: 'translate'; templateParams: TranslateParams }
  | { template: 'rewrite'; templateParams: RewriteParams }
  | { template: 'generate_content'; templateParams: GenerateContentParams }

const templates: StreamTemplateDefinition<unknown>[] = [
  fixReadability as StreamTemplateDefinition<unknown>,
  translate as StreamTemplateDefinition<unknown>,
  rewrite as StreamTemplateDefinition<unknown>,
  generateContent as StreamTemplateDefinition<unknown>,
]

/**
 * Resolve a template call into a system prompt and user message
 * for the streaming sub-agent. Optionally includes additional context
 * from skills that provide stream context for the given template.
 *
 * When skill context is provided, it replaces the template's
 * defaultInstructions. They are never both appended.
 */
export function resolveTemplate(
  call: TemplateCall,
  fields: FieldInput[],
  skillContext?: string,
): { systemPrompt: string; userMessage: string } {
  const template = templates.find((t) => t.name === call.template)
  if (!template) {
    throw new Error(`Unknown stream template: ${call.template}`)
  }

  const result = template.build(call.templateParams, fields)

  if (skillContext) {
    result.systemPrompt += '\n\n' + skillContext
  } else if (template.defaultInstructions) {
    result.systemPrompt += '\n\n' + template.defaultInstructions
  }

  return result
}
