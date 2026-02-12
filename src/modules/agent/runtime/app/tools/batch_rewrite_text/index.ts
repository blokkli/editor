import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import Component from './Component.vue'

const paramsSchema = z.object({
  uuids: z
    .record(z.string(), z.record(z.string(), z.string()))
    .describe(
      'A map of uuids containing a map of field names to field values.',
    ),
  requireApproval: z
    .boolean()
    .optional()
    .describe('Whether to show the approval UI.'),
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
    .describe(
      'Map of rejected paragraph UUID to field name to rejection details',
    ),
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
    'Rewrite text content in multiple content fields at once. Set requireApproval to true when the user should confirm the changes first. EXAMPLE: { "uuids": { "<UUID>": { "title": "New title", "text": "New text" } } }',
  category: 'mutation',
  prunedSummary: (r) =>
    `${r.acceptedCount || 0} accepted, ${Object.keys(r.rejectedByUser || {}).length} rejected`,
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
    uuids: {
      'mock-1': { title: 'Updated Title Text' },
      'mock-2': { body: 'This is the new body content with some changes.' },
      'mock-3': { subtitle: 'A fresh subtitle here' },
    },
    requireApproval: true,
  }),
})
