import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  // Coerce so a numeric string (e.g. "5") is accepted — the LLM often sends the
  // index as a string. A non-numeric string is still rejected.
  index: z.coerce
    .number()
    .describe(
      'History index to navigate to (-1 = pristine state, 0+ = mutation index)',
    ),
})

export default defineBlokkliAgentTool({
  name: 'go_to_history_index',
  description: `Navigate to a specific point in mutation history (undo/redo). -1 = pristine state, 0 = first mutation, etc.`,
  category: 'mutation',
  lazy: true,
  prunedSummary: (r) =>
    r.success ? `navigated to index ${r.historyIndex ?? '?'}` : 'rejected',
  modes: ['editing', 'translating'],
  label($t) {
    return $t('aiAgentGoToHistoryIndexRunning', 'Navigating history', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['setHistoryIndex'],
  execute(ctx, params) {
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
