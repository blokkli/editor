import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

export default defineBlokkliAgentPrompt({
  id: 'translate_to_german',
  contexts: ['item', 'welcome'],
  getLabel: () => {
    return 'Auf Deutsch übersetzen...'
  },
  getPrompt: () => {
    return `Übersetze die ausgewählten Blöcke auf Deutsch. Verwende dazu das get_content_fields Tool für den Block. Dann verwende update_text_fields um mehrere Texte auf einmal zu übersetzen. Falls verfügbar, verwende passende Skills.`
  },
  getUserPrompt: () => {
    return `Übersetze die ausgewählten Blöcke auf Deutsch.`
  },
})
