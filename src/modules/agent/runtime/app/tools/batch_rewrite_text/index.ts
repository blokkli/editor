import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import Component from './Component.vue'

const changeSchema = z.object({
  uuid: z.string().describe('The block UUID containing the field'),
  fieldName: z.string().describe('The field name to update'),
  value: z.string().describe('The new text content'),
})

const paramsSchema = z.object({
  changes: z.array(changeSchema).describe('List of text changes to apply'),
})

const resultSchema = z.object({
  applied: z
    .array(
      z.object({
        uuid: z.string(),
        fieldName: z.string(),
      }),
    )
    .describe('Changes that were applied'),
  rejected: z
    .array(
      z.object({
        uuid: z.string(),
        fieldName: z.string(),
      }),
    )
    .describe('Changes that were rejected by the user'),
  label: z.string().describe('Human-readable summary of what happened'),
})

export type BatchRewriteParams = z.infer<typeof paramsSchema>
export type BatchRewriteResult = z.infer<typeof resultSchema>
export type BatchRewriteChange = z.infer<typeof changeSchema>

export default defineBlokkliAgentTool({
  name: 'batch_rewrite_text',
  description:
    'Rewrite text content in multiple fields at once. Shows previews immediately and lets the user select which changes to apply. Use this when you need to update multiple text fields.',
  category: 'mutation',
  modes: ['editing', 'translating'],
  label: ($t) =>
    $t('aiAgentBatchRewriteTextRunning', 'Rewriting multiple texts...'),
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['updateFieldValue'],
  component: Component,
  execute: (_ctx, params) => params,
  mockParams: () => ({
    changes: [
      { uuid: 'mock-1', fieldName: 'title', value: 'Updated Title Text' },
      {
        uuid: 'mock-2',
        fieldName: 'body',
        value: 'This is the new body content with some changes.',
      },
      { uuid: 'mock-3', fieldName: 'subtitle', value: 'A fresh subtitle here' },
    ],
  }),
})
