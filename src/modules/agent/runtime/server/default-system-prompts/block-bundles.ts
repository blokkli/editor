import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import { formatItems } from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'block-bundles',
  title: 'Available Block Bundles',
  weight: 810,
  getPrompt: (context) => {
    return formatItems(
      context.pageContext.bundles.map((b) => ({
        id: b.id,
        label: b.label,
        description: b.description,
      })),
      undefined,
      'Use `get_bundle_info` with a parent UUID and field name to get full details about which bundles can be added and what fields they have.',
    )
  },
})
