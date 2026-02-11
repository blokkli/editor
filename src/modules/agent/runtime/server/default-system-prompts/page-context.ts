import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import {
  formatContentField,
  getEditModeDescription,
} from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'page-context',
  title: 'Current Page',
  weight: 800,
  cacheGroup: 'per-page',
  getPrompt: ({ pageContext }) => {
    let intro = `The title of the page being edited is "${pageContext.title}".`
    if (pageContext.isPublished === true) {
      intro += ' The page is currently published.'
    } else if (pageContext.isPublished === false) {
      intro += ' The page is currently not published.'
    }

    intro += ` The UUID is "${pageContext.entityUuid}", its entity type is "${pageContext.entityType}" and the bundle is "${pageContext.entityBundle}", but the user refers to the bundle as "${pageContext.bundleLabel}".`

    if (pageContext.entityLanguage) {
      intro += ` The ISO language code for content on this page is "${pageContext.entityLanguage}".`
    }

    const lines = [intro]

    if (pageContext.editMode === 'editing') {
      lines.push(
        '',
        '### Parent for Root-Level Paragraphs',
        '',
        'When adding paragraphs directly to the page, use this parent object:',
        '```json',
        JSON.stringify(
          {
            type: pageContext.entityType,
            uuid: pageContext.entityUuid,
            field: '<field_name>',
          },
          null,
          2,
        ),
        '```',
      )
    }

    // Add entity content fields if present
    if (pageContext.entityContentFields?.length) {
      lines.push(
        '',
        '## Entity Content Fields',
        '',
        `The page entity itself has the following content fields that can be read/edited using get_content_fields, batch_rewrite_text, and replace_media_field with the entity UUID (\`${pageContext.entityUuid}\`):`,
        '',
      )
      for (const field of pageContext.entityContentFields) {
        lines.push(formatContentField(field))
      }
    }

    // Add edit mode information
    const editModeDescription = getEditModeDescription(pageContext.editMode)
    if (editModeDescription) {
      lines.push('', '## Edit Mode', '', editModeDescription)
    }

    return lines.join('\n')
  },
})
