import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import Component from './Component.vue'
import DetailsComponent from './Details/index.vue'

const operationSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  fieldName: z.string().describe('The editable field name'),
  search: z
    .string()
    .describe(
      'Text to find in the field value, OR a CSS selector (e.g. "p:nth-child(3)") to target a specific HTML element',
    ),
  replace: z
    .string()
    .describe(
      'The replacement text (or innerHTML when search is a CSS selector)',
    ),
  selector: z
    .boolean()
    .optional()
    .describe(
      'Set to true when search is a CSS selector instead of a text search',
    ),
})

const paramsSchema = z.object({
  uuids: z
    .record(z.string(), z.record(z.string(), z.string()))
    .optional()
    .describe(
      'Full value replacements: map of paragraph UUID → field name → new value.',
    ),
  operations: z
    .array(operationSchema)
    .optional()
    .describe(
      'Patch operations: search/replace pairs applied to current field values. Use for small targeted edits like typo fixes.',
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
  name: 'update_text_fields',
  description:
    'Update text content fields on one or more paragraphs. Supports two modes: (1) Full replacement via "uuids" — provide complete new values. (2) Patch via "operations" — search/replace pairs applied to current values, ideal for small edits like typo fixes. Set "selector" to true to use a CSS selector instead of text search. Set requireApproval to true when the user should confirm the changes first.',
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
  detailsComponent: DetailsComponent,
  buildDetails: (result) => result,
  execute(_ctx, params) {
    return params
  },
  mockParams: () => ({
    uuids: {
      '4526d2d0-f122-4093-902f-e2f00a433981': {
        title: 'Seamlessly integrates in any Nuxt setup',
        tagline: 'Great Developer Experience',
      },
      '9485812c-0ecd-4699-85b2-3a031d47a0a1': {
        text: '<ul><li>Fully responsive design</li><li>Touch gestures and smooth interactions</li><li>All editing features available on mobile</li><li>Optimized for tablets</li></ul>',
      },
      '67a9e26f-8028-4283-8b7d-8f836355b949': {
        text: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p><p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra.</p>',
      },
      '3a2617ed-6844-4d39-859c-82869f4ea5aa': {
        text: '<ul><li>Auto import block components</li><li>Directly define options inside the component</li><li>Support for import chunks</li></ul>',
      },
    },
    requireApproval: true,
  }),
})
