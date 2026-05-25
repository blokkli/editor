import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
} from '../../helpers/validation'
import { onlyUnique } from '#blokkli/helpers'
import { fieldDiffResultSchema } from '../schemas'
import { booleanParam } from '#blokkli/agent/shared/toolParams'
import { resolveHost } from '../helpers'
import { skippedFieldsMessage, type SkippedField } from '../fieldDiffApproval'
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
  selector: booleanParam(
    'Set to true when search is a CSS selector instead of a text search',
  ).optional(),
})

const updateSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  fieldName: z.string().describe('The editable field name'),
  value: z
    .string()
    .describe('The complete new field value — overwrites the entire field'),
})

const paramsSchema = z.object({
  updates: z
    .array(updateSchema)
    .optional()
    .describe(
      'Full-replacement mode: a list of { uuid, fieldName, value } entries. Each overwrites the entire field with the given value. Use when the value changes substantially or you already have the final text.',
    ),
  operations: z
    .array(operationSchema)
    .optional()
    .describe(
      "Patch mode: search/replace operations applied to each field's CURRENT value, so `search` must match the existing content exactly. Best for small targeted edits like typo fixes — avoids re-sending the whole value. If `search` is not found, that field is left unchanged.",
    ),
  requireApproval: booleanParam(
    'The approval UI is shown by default. Set to false to apply the changes immediately without confirmation — only when the user supplied the exact text themselves.',
  ).optional(),
})

export type BatchRewriteParams = z.infer<typeof paramsSchema>
export type BatchRewriteResult = z.infer<typeof fieldDiffResultSchema>

/**
 * The resolved params handed to the component after `execute` has dropped
 * references that don't exist. `updates`/`operations` are pre-filtered to valid
 * (uuid, fieldName) pairs; `skipped` lists what was dropped so the component can
 * report it back to the agent.
 */
export type ComponentParams = {
  updates?: z.infer<typeof updateSchema>[]
  operations?: z.infer<typeof operationSchema>[]
  requireApproval?: boolean
  skipped: SkippedField[]
}

export default defineBlokkliAgentTool({
  name: 'update_text_fields',
  description:
    'Update text content fields on one or more paragraphs. Two modes, which may be combined in a single call:\n- Full replacement via `updates`: a list of { uuid, fieldName, value } entries, each overwriting the entire field with a complete new value. Use when the value changes substantially or you already have the final text.\n- Patch via `operations`: search/replace pairs applied to each field\'s CURRENT value (so `search` must match the existing content). Best for small edits like typo fixes, since you only send the changed part. Set `selector: true` on an operation to treat `search` as a CSS selector (e.g. "p:nth-child(3)") and `replace` as the matched element\'s innerHTML.\nThe approval UI is shown by default; set requireApproval to false to apply immediately (only when the user supplied the exact text).',
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
    // Validate every (uuid, fieldName) reference. Drop the ones that point at a
    // non-existent paragraph or field and report them back, instead of silently
    // producing an empty diff or an orphan mutation.
    const skipped: SkippedField[] = []

    const skipReason = (
      uuid: string,
      fieldName: string,
    ): string | undefined => {
      const host = resolveHost(ctx.app, uuid)
      if (!host) return 'paragraph not found'
      const field = ctx.app.types.editableFieldConfig.forName(
        host.entityType,
        host.bundle,
        fieldName,
      )
      if (!field) return 'field not found'
      return undefined
    }

    const keep = <T extends { uuid: string; fieldName: string }>(
      entries: T[] | undefined,
    ): T[] | undefined =>
      entries?.filter((entry) => {
        const reason = skipReason(entry.uuid, entry.fieldName)
        if (reason) {
          skipped.push({ uuid: entry.uuid, fieldName: entry.fieldName, reason })
          return false
        }
        return true
      })

    const updates = keep(params.updates)
    const operations = keep(params.operations)

    // Nothing valid left — don't render an empty approval UI. Report the invalid
    // references (or the empty input) so the agent can correct them.
    if (!updates?.length && !operations?.length) {
      return {
        error:
          skippedFieldsMessage(skipped) ??
          'No updates or operations were provided.',
      }
    }

    // Resolve bundles for permission check on the kept UUIDs (skip entity-level)
    const blockUuids = [
      ...(updates?.map((u) => u.uuid) ?? []),
      ...(operations?.map((op) => op.uuid) ?? []),
    ].filter(onlyUnique)

    const bundles = blockUuids
      .map((uuid) => ctx.app.blocks.getBlock(uuid)?.bundle)
      .filter((b): b is string => !!b)
      .filter(onlyUnique)

    if (bundles.length) {
      const denied = requireBundlePermission(ctx.app, bundles, 'edit')
      if (denied) return denied
    }

    // Check ancestor restrictions
    const ancestorDenied = requireNoRestrictedAncestor(ctx.app, blockUuids)
    if (ancestorDenied) return ancestorDenied

    return {
      updates,
      operations,
      requireApproval: params.requireApproval,
      skipped,
    } satisfies ComponentParams
  },
  mockParams: () => ({
    updates: [
      {
        uuid: '4526d2d0-f122-4093-902f-e2f00a433981',
        fieldName: 'title',
        value: 'Seamlessly integrates in any Nuxt setup',
      },
      {
        uuid: '4526d2d0-f122-4093-902f-e2f00a433981',
        fieldName: 'tagline',
        value: 'Great Developer Experience',
      },
      {
        uuid: '9485812c-0ecd-4699-85b2-3a031d47a0a1',
        fieldName: 'text',
        value:
          '<ul><li>Fully responsive design</li><li>Touch gestures and smooth interactions</li><li>All editing features available on mobile</li><li>Optimized for tablets</li></ul>',
      },
      {
        uuid: '67a9e26f-8028-4283-8b7d-8f836355b949',
        fieldName: 'text',
        value:
          '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p><p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra.</p>',
      },
      {
        uuid: '3a2617ed-6844-4d39-859c-82869f4ea5aa',
        fieldName: 'text',
        value:
          '<ul><li>Auto import block components</li><li>Directly define options inside the component</li><li>Support for import chunks</li></ul>',
      },
    ],
    requireApproval: true,
  }),
})
