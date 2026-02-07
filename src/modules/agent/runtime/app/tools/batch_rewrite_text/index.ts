import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import Component from './Component.vue'

const paramsSchema = z.object({
  changes: z
    .record(z.string(), z.record(z.string(), z.string()))
    .describe('Map of block UUID to field name to new text value'),
  requireApproval: z
    .boolean()
    .default(true)
    .describe(
      'Whether to show the approval UI. Set to false when the user already explicitly provided the text content.',
    ),
})

const resultSchema = z.object({
  acceptedCount: z.number().describe('Number of changes accepted by the user'),
  rejectedByUser: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.object({
          reasonForRejection: z
            .string()
            .describe(
              'Reason provided by the user for rejecting, empty if no reason given',
            ),
        }),
      ),
    )
    .describe('Map of rejected block UUID to field name to rejection details'),
  label: z.string().describe('Human-readable summary shown in the UI'),
  agentMessage: z
    .string()
    .optional()
    .describe(
      'Detailed message for the agent, replaces label in the LLM context',
    ),
  historyIndex: z
    .number()
    .optional()
    .describe('The mutation history index after applying changes'),
})

export type BatchRewriteParams = z.infer<typeof paramsSchema>
export type BatchRewriteResult = z.infer<typeof resultSchema>

export default defineBlokkliAgentTool({
  name: 'batch_rewrite_text',
  description:
    'Rewrite text content in multiple content fields at once. Shows previews immediately and lets the user select which changes to apply. Use this when you need to update multiple text fields. Set requireApproval to false when the user has already explicitly provided or confirmed the exact text to use.',
  category: 'mutation',
  modes: ['editing', 'translating'],
  label($t) {
    return $t('aiAgentBatchRewriteTextRunning', 'Rewriting multiple texts...')
  },
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['updateFieldValueBatched'],
  component: Component,
  execute(_ctx, params) {
    return params
  },
  mockParams: () => ({
    changes: {
      'mock-1': { title: 'Updated Title Text' },
      'mock-2': { body: 'This is the new body content with some changes.' },
      'mock-3': { subtitle: 'A fresh subtitle here' },
    },
    requireApproval: true,
  }),
})
