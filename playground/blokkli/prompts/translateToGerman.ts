import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

export default defineBlokkliAgentPrompt({
  id: 'translate_to_german',
  getLabel: () => {
    return 'Auf Deutsch übersetzen...'
  },
  getPrompt: () => {
    return `Übersetze die ausgewählten Blöcke auf Deutsch. Verwende dazu das get_content_fields Tool für den Block. Dann verwende batch_rewrite_text um mehrere Texte auf einmal zu übersetzen. Falls verfügbar, verwende passende Skills.`
  },
  getUserPrompt: () => {
    return `Übersetze die ausgewählten Blöcke auf Deutsch.`
  },
})
