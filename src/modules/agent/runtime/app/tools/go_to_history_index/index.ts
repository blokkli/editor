import { z } from 'zod'
import { defineBlokkliMcpTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  index: z
    .number()
    .describe(
      'History index to navigate to (-1 = pristine state, 0+ = mutation index)',
    ),
})

export default defineBlokkliMcpTool({
  name: 'go_to_history_index',
  description:
    'Navigate to a specific point in mutation history. Use -1 for pristine state, ' +
    '0 for first mutation, etc. Useful for undoing changes or reverting to earlier states. ' +
    'Note: All query tools reflect the current history state - navigating back will restore previously deleted blocks.',
  category: 'mutation',
  modes: ['editing'],
  label: ($t) => $t('aiAgentGoToHistoryIndexRunning', 'Navigating history...'),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['setHistoryIndex'],
  execute: (ctx, params) => {
    const { $t, state } = ctx.app
    const mutations = state.mutations.value
    const currentIndex = state.currentMutationIndex.value

    // Validate index range: -1 to mutations.length - 1
    const minIndex = -1
    const maxIndex = mutations.length - 1

    if (params.index < minIndex) {
      return { error: `Index ${params.index} is below minimum (-1)` }
    }

    if (params.index > maxIndex) {
      return {
        error: `Index ${params.index} exceeds maximum (${maxIndex}). There are ${mutations.length} mutations.`,
      }
    }

    if (params.index === currentIndex) {
      return { error: `Already at history index ${params.index}` }
    }

    // Determine direction for label
    const isUndo = params.index < currentIndex
    const steps = Math.abs(currentIndex - params.index)

    const label = isUndo
      ? $t('aiAgentUndoDone', 'Undid @count changes').replace(
          '@count',
          String(steps),
        )
      : $t('aiAgentRedoDone', 'Redid @count changes').replace(
          '@count',
          String(steps),
        )

    return {
      type: 'move' as const,
      label,
      apply: (adapter) => adapter.setHistoryIndex!(params.index),
    }
  },
})
