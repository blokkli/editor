import { defineBlokkliAgentSystemPrompt } from '../system-prompts'
import {
  formatContentField,
  getEditModeDescription,
} from '../system-prompts/helpers'

export default defineBlokkliAgentSystemPrompt({
  id: 'page-context',
  title: 'Current Page',
  weight: 800,
  getPrompt: (context) => {
    const { pageContext } = context
    const lines: string[] = [
      `- title: ${pageContext.title}`,
      `- bundle: ${pageContext.entityBundle} (${pageContext.bundleLabel})`,
      `- status: ${pageContext.isPublished ? 'Published' : 'Unpublished'}`,
    ]

    if (pageContext.entityLanguage) {
      lines.push(
        `- contentLanguage: ${pageContext.entityLanguage} (language to use for generating content)`,
      )
    }

    if (pageContext.interfaceLanguage) {
      lines.push(
        `- interfaceLanguage: ${pageContext.interfaceLanguage} (language to use for interaction with user)`,
      )
    }

    lines.push(
      '',
      '### Parent for Root-Level Blocks',
      '',
      'When adding blocks directly to the page, use this parent object:',
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
