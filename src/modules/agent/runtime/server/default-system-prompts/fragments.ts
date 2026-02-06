import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import { formatItems } from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'fragments',
  title: 'Available Fragments',
  weight: 820,
  modes: ['editing'],
  getPrompt: (context) => {
    return formatItems(
      context.pageContext.fragments.map((f) => ({
        id: f.name,
        label: f.label,
        description: f.description,
      })),
      'Fragments are hardcoded content components that can be added to the page. They have no content that can be edited by users.',
    )
  },
})
