import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
} from '../../helpers/validation'
import { fromLibraryBlockBundle } from '#blokkli-build/config'

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('UUIDs of library paragraphs to detach'),
})

export default defineBlokkliAgentTool({
  name: 'detach_reusable_paragraph',
  description:
    'Detach one or more library paragraphs to create editable copies. ' +
    'IMPORTANT: The original library paragraph UUIDs will no longer exist after detaching. ' +
    'The result includes newParagraphs containing the UUIDs and bundles of the newly created editable paragraph. ' +
    'Use these new UUIDs for any subsequent operations.',
  category: 'mutation',
  prunedSummary: (r) =>
    r.success
      ? `detached ${r.newParagraphs?.length || 0} paragraphs`
      : 'rejected',
  lazy: true,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentDetachLibraryBlockRunning', 'Detaching library block...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['detachReusableBlock'],
  execute(ctx, params) {
    const { blocks, $t } = ctx.app

    if (params.uuids.length === 0) {
      return { error: 'No paragraph UUIDs provided' }
    }

    // Check edit permission for from_library bundle
    const denied = requireBundlePermission(
      ctx.app,
      [fromLibraryBlockBundle],
      'edit',
    )
    if (denied) return denied

    // Check ancestor restrictions
    const ancestorDenied = requireNoRestrictedAncestor(ctx.app, params.uuids)
    if (ancestorDenied) return ancestorDenied

    // Validate all blocks exist and are library blocks
    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) {
        return { error: `Paragraph not found: ${uuid}` }
      }
      if (block.bundle !== fromLibraryBlockBundle) {
        return {
          error: `Paragraph ${uuid} is not a library paragraph (bundle: ${block.bundle}). Only ${fromLibraryBlockBundle} paragraphs can be detached.`,
        }
      }
    }

    const label =
      params.uuids.length === 1
        ? $t('aiAgentDetachLibraryBlockDone', 'Detached library block')
        : $t(
            'aiAgentDetachLibraryBlocksDone',
            'Detached @count library blocks',
          ).replace('@count', String(params.uuids.length))

    return {
      type: 'rewrite' as const,
      label,
      apply: (adapter) => adapter.detachReusableBlock!({ uuids: params.uuids }),
    }
  },
})
