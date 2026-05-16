import { computed, useBlokkli } from '#imports'
import type { ComputedRef } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { ThemeContextColorGroup } from '../../../../../global/types/theme'
import type { AgentConversationFeedbackRating } from '../features/agent/types'

export type AgentFeedbackOption = {
  value: AgentConversationFeedbackRating
  label: string
  icon: BlokkliIcon
  theme: ThemeContextColorGroup
}

export function useAgentFeedbackOptions(): ComputedRef<AgentFeedbackOption[]> {
  const { $t } = useBlokkli()

  return computed(() => [
    {
      value: 'bad',
      label: $t('aiAgentFeedbackBad', 'Bad'),
      icon: 'bk_mdi_thumb_down',
      theme: 'red',
    },
    {
      value: 'fine',
      label: $t('aiAgentFeedbackFine', 'Fine'),
      icon: 'bk_mdi_thumb_up',
      theme: 'yellow',
    },
    {
      value: 'good',
      label: $t('aiAgentFeedbackGood', 'Good'),
      icon: 'bk_mdi_thumbs_up_double',
      theme: 'lime',
    },
  ])
}
