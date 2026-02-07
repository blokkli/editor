import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import { formatItems } from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'block-bundles',
  title: 'Available Block Bundles',
  weight: 810,
  getPrompt: (context) => {
    return formatItems(
      context.pageContext.bundles.map((b) => {
        if (b.id === 'from_library') {
          return {
            id: 'from_library',
            label: 'From Library',
            description:
              'A reusable block from the library. Its content can not be edited, but it can be moved, deleted or detached.',
          }
        }
        const blockFields = b.blockFields.map((v) => v.name).join(', ')
        const contentFields = b.contentFields.map((v) => v.name).join(', ')
        const lines = [b.description]

        if (blockFields.length) {
          lines.push(`Block Fields: [${blockFields}]`)
        }
        if (contentFields) {
          lines.push(`Content Fields: [${contentFields}]`)
        }
        return {
          id: b.id,
          label: b.label,
          description: lines.join('\n\n'),
        }
      }),
      undefined,
      'Use `get_bundle_info` with a parent UUID and field name to get full details about which bundles can be added and what fields they have.',
    )
  },
})
