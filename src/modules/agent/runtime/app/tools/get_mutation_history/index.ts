import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  before: z
    .number()
    .optional()
    .describe('How many mutations before current to include'),
  after: z
    .number()
    .optional()
    .describe('How many mutations after current to include (redo-able)'),
})

const mutationSummarySchema = z.object({
  index: z.number().describe('History index for use with go_to_history_index'),
  label: z.string().describe('Human-readable mutation label'),
})

const currentMutationSchema = z.object({
  index: z.number().describe('History index for use with go_to_history_index'),
  label: z.string().describe('Human-readable mutation label'),
  pluginId: z.string().optional().describe('Internal plugin ID'),
  affectedBlockUuid: z
    .string()
    .optional()
    .describe('UUID of the block that was affected'),
})

const resultSchema = z.object({
  currentIndex: z
    .number()
    .describe('Current position in history (-1 = pristine state)'),
  totalCount: z.number().describe('Total mutations in history'),
  canUndo: z.boolean().describe('Whether undo is possible'),
  canRedo: z.boolean().describe('Whether redo is possible'),
  currentMutation: currentMutationSchema
    .nullable()
    .describe('Details of current mutation (null if at pristine state)'),
  mutationsBefore: z
    .array(mutationSummarySchema)
    .optional()
    .describe('Previous mutations (if before > 0)'),
  mutationsAfter: z
    .array(mutationSummarySchema)
    .optional()
    .describe('Following mutations (if after > 0)'),
})

export default defineBlokkliAgentTool({
  name: 'get_mutation_history',
  description: `Get information about the mutation history. Returns current position, undo/redo availability, and optionally context mutations before/after the current position. Use with go_to_history_index to navigate.`,
  category: 'query',
  volatile: true,
  prunedSummary: (r) => `index ${r.currentIndex ?? -1}/${r.totalCount ?? 0}`,
  modes: ['editing', 'translating'],
  label($t) {
    return $t('aiAgentGetMutationHistoryRunning', 'Getting mutation history...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { state, $t } = ctx.app
    const mutations = state.mutations.value
    const currentIndex = state.currentMutationIndex.value

    const totalCount = mutations.length
    const canUndo = currentIndex > -1
    const canRedo = currentIndex < totalCount - 1

    const getMutationLabel = (mutation: (typeof mutations)[number]): string => {
      return mutation.plugin?.label || mutation.pluginId || 'Unknown mutation'
    }

    // Current mutation details (null if at pristine state)
    let currentMutation: z.infer<typeof currentMutationSchema> | null = null
    if (currentIndex >= 0 && currentIndex < mutations.length) {
      const mutation = mutations[currentIndex]
      if (mutation) {
        currentMutation = {
          index: currentIndex,
          label: getMutationLabel(mutation),
          pluginId: mutation.pluginId,
          affectedBlockUuid: mutation.plugin?.affectedItemUuid,
        }
      }
    }

    // Mutations before current (if requested)
    let mutationsBefore: z.infer<typeof mutationSummarySchema>[] | undefined
    if (params.before && params.before > 0 && currentIndex >= 0) {
      const startIndex = Math.max(0, currentIndex - params.before)
      mutationsBefore = []
      for (let i = startIndex; i < currentIndex; i++) {
        const mutation = mutations[i]
        if (mutation) {
          mutationsBefore.push({
            index: i,
            label: getMutationLabel(mutation),
          })
        }
      }
    }

    // Mutations after current (if requested)
    let mutationsAfter: z.infer<typeof mutationSummarySchema>[] | undefined
    if (params.after && params.after > 0 && currentIndex < totalCount - 1) {
      const endIndex = Math.min(totalCount - 1, currentIndex + params.after)
      mutationsAfter = []
      for (let i = currentIndex + 1; i <= endIndex; i++) {
        const mutation = mutations[i]
        if (mutation) {
          mutationsAfter.push({
            index: i,
            label: getMutationLabel(mutation),
          })
        }
      }
    }

    return {
      label: $t('aiAgentGetMutationHistoryDone', 'Got mutation history'),
      result: {
        currentIndex,
        totalCount,
        canUndo,
        canRedo,
        currentMutation,
        mutationsBefore,
        mutationsAfter,
      },
    }
  },
})
