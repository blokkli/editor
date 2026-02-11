import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import { formatItems } from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'paragraph-bundles',
  title: 'Available Paragraph Bundles',
  weight: 810,
  cacheGroup: 'per-page',
  getPrompt: (context) => {
    return formatItems(
      context.pageContext.bundles.map((b) => {
        if (b.id === 'from_library') {
          return {
            id: 'from_library',
            label: 'From Library',
            description:
              'A reusable paragraph from the library. Its content can not be edited, but it can be moved, deleted or detached.',
          }
        }
        const paragraphFields = b.paragraphFields.map((v) => v.name).join(', ')
        const contentFields = b.contentFields.map((v) => v.name).join(', ')
        const lines = [b.description]

        if (paragraphFields.length) {
          lines.push(`Paragraph Fields: [${paragraphFields}]`)
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
