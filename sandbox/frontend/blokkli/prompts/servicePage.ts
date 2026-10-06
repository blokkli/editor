import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

// The prompt is what the editor could have typed, in their language: the agent
// answers in the language of the first message. How a service page is built
// is in the skill.
export default defineBlokkliAgentPrompt({
  id: 'blockingen_service_page',
  contexts: ['welcome'],
  skills: ['blockingen-pages', 'blockingen-style-guide'],
  tools: ['get_town_data', 'search_templates', 'add_template'],
  getLabel: ({ $t }) =>
    $t('blockingenAgentServicePage', 'Write a service page'),
  getPrompt: ({ $t }) =>
    $t(
      'blockingenAgentServicePagePrompt',
      'Write this page as a service page of the town. First ask me what it should cover.',
    ),
})
