import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import { formatItems } from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'available-skills',
  title: 'Available Skills',
  weight: 900,
  cacheGroup: 'per-page',
  getPrompt: (context) => {
    return formatItems(
      context.resolvedSkills.map((s) => ({
        id: s.name,
        label: context.loadedSkills.has(s.name)
          ? `${s.englishLabel} (loaded)`
          : s.englishLabel,
        description: context.loadedSkills.has(s.name)
          ? 'Already loaded in the conversation. Do NOT load again.'
          : s.description,
      })),
      'You can load detailed guidelines using the `load_skill` tool. Use skills when the task requires following specific rules or guidelines.',
    )
  },
})
