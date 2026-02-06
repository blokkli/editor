import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import { formatItems } from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'available-tools',
  title: 'Additional Tools',
  weight: 1000,
  getPrompt: (context) => {
    return formatItems(
      context.lazyTools.map((t) => ({
        id: t.name,
        label: t.name,
        description: t.description,
      })),
      'The following tools are available but must be loaded first by calling `load_tools`. Only load tools you actually need for the current task.',
    )
  },
})
