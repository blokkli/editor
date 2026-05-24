import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
} from '../../helpers/validation'
import { onlyUnique } from '#blokkli/helpers'
import { fieldDiffResultSchema } from '../schemas'
import Component from './Component.vue'
import DetailsComponent from '../../components/FieldDiffDetails/index.vue'

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
      'Full-replacement mode: map of paragraph UUID → field name → the complete new field value. The entire field is overwritten. Use when you have the final text or the value changes substantially.',
    ),
  operations: z
    .array(operationSchema)
    .optional()
    .describe(
      "Patch mode: search/replace operations applied to each field's CURRENT value, so `search` must match the existing content exactly. Best for small targeted edits like typo fixes — avoids re-sending the whole value. If `search` is not found, that field is left unchanged.",
    ),
  requireApproval: z
    .boolean()
    .optional()
    .describe(
      'The approval UI is shown by default. Set to false to apply the changes immediately without confirmation — only when the user supplied the exact text themselves.',
    ),
})

export type BatchRewriteParams = z.infer<typeof paramsSchema>
export type BatchRewriteResult = z.infer<typeof fieldDiffResultSchema>

export default defineBlokkliAgentTool({
  name: 'update_text_fields',
  description:
    'Update text content fields on one or more paragraphs. Two modes, which may be combined in a single call:\n- Full replacement via `uuids`: overwrite the entire field with a complete new value. Use when the value changes substantially or you already have the final text.\n- Patch via `operations`: search/replace pairs applied to each field\'s CURRENT value (so `search` must match the existing content). Best for small edits like typo fixes, since you only send the changed part. Set `selector: true` on an operation to treat `search` as a CSS selector (e.g. "p:nth-child(3)") and `replace` as the matched element\'s innerHTML.\nThe approval UI is shown by default; set requireApproval to false to apply immediately (only when the user supplied the exact text).',
  category: 'mutation',
  lazy: true,
  prunedSummary: (r) =>
    `${r.acceptedCount || 0} accepted, ${Object.keys(r.rejectedByUser || {}).length} rejected`,
  modes: ['editing', 'translating'],
  label($t) {
    return $t('aiAgentBatchRewriteTextRunning', 'Rewriting multiple texts', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema: fieldDiffResultSchema,
  requiredAdapterMethods: ['updateFieldValueBatched'],
  component: Component,
  detailsComponent: DetailsComponent,
  buildDetails: (result) => result,
  execute(ctx, params) {
    // Collect all block UUIDs from both uuids and operations params
    const blockUuids: string[] = []
    if (params.uuids) {
      blockUuids.push(...Object.keys(params.uuids))
    }
    if (params.operations) {
      blockUuids.push(...params.operations.map((op) => op.uuid))
    }

    // Resolve bundles for permission check (skip entity-level UUIDs)
    const bundles = blockUuids
      .filter(onlyUnique)
      .map((uuid) => ctx.app.blocks.getBlock(uuid)?.bundle)
      .filter((b): b is string => !!b)
      .filter(onlyUnique)

    if (bundles.length) {
      const denied = requireBundlePermission(ctx.app, bundles, 'edit')
      if (denied) return denied
    }

    // Check ancestor restrictions
    const uniqueUuids = blockUuids.filter(onlyUnique)
    const ancestorDenied = requireNoRestrictedAncestor(ctx.app, uniqueUuids)
    if (ancestorDenied) return ancestorDenied

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
