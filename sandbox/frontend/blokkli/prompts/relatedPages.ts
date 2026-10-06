import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

// Only offered where the host has "Related topics" (the detail page).
export default defineBlokkliAgentPrompt({
  resolve: (app) => {
    const { entityType, entityBundle } = app.context.value
    if (!app.types.getFieldConfig(entityType, entityBundle, 'field_related')) {
      return []
    }
    return {
      id: 'blockingen_related_pages',
      contexts: ['welcome'],
      skills: ['blockingen-pages'],
      tools: ['search_content', 'add_content_search_paragraphs'],
      getLabel: ({ $t }) =>
        $t('blockingenAgentRelatedPages', 'Link related pages'),
      getPrompt: ({ $t }) =>
        $t(
          'blockingenAgentRelatedPagesPrompt',
          'Find up to three pages related to this one and add them as teasers to “Related topics”.',
        ),
    }
  },
})
