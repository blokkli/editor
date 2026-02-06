import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'rewrite-and-translate',
  label: { en: 'Rewrite and Translate', de: 'Umschreiben und Übersetzen' },
  description:
    'ALWAYS use this skill when asked to rewrite OR translate texts.',
  getContents: () => `
- Use the batch_rewrite_text tool to rewrite or translate multiple texts at once!
- The batch_rewrite_text will ASK the user accept each changed text - no need to manually ask the user beforehand!
- If unsure about something: USE THE ask_question TOOL!
- When asked for suggestions by the user: USE THE ask_question TOOL!
`,
})
