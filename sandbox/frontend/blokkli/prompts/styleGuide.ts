import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

// Works with a selection (the paragraph's menu) and without one (the welcome
// screen): then the whole page. The rewrite sub-agent gets the style guide
// through its `streamTemplates`.
export default defineBlokkliAgentPrompt({
  id: 'blockingen_style_guide',
  contexts: ['item', 'welcome'],
  skills: ['blockingen-style-guide', 'rewrite-and-translate'],
  tools: ['get_page_text', 'delegate_text_rewrite', 'update_text_fields'],
  getLabel: ({ $t }) =>
    $t('blockingenAgentStyleGuide', 'Check the style guide'),
  getPrompt: ({ $t, selection }) =>
    selection.items.value.length
      ? $t(
          'blockingenAgentStyleGuidePromptSelection',
          'Check the selected blocks against the style guide and fix what breaks it.',
        )
      : $t(
          'blockingenAgentStyleGuidePrompt',
          'Check the texts of this page against the style guide and fix what breaks it.',
        ),
})
