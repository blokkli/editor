import type { StreamTemplateName } from '../skills/types'

export type FieldInput = {
  uuid: string
  fieldName: string
  currentValue: string
  fieldType: 'plain' | 'markup'
}

export type TemplateResult = {
  systemPrompt: string
  userMessage: string
}

export type StreamTemplateDefinition<TParams = unknown> = {
  name: StreamTemplateName
  build: (params: TParams, fields: FieldInput[]) => TemplateResult
  /** Appended to system prompt only when no skill provides context. */
  defaultInstructions?: string
}
