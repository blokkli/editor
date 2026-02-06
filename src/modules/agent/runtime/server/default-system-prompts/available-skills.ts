import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import { formatItems } from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'available-skills',
  title: 'Available Skills',
  weight: 900,
  getPrompt: (context) => {
    return formatItems(
      context.resolvedSkills.map((s) => ({
        id: s.name,
        label: s.englishLabel,
        description: s.description,
      })),
      'You can load detailed guidelines using the `load_skill` tool. Use skills when the task requires following specific rules or guidelines.',
    )
  },
})
