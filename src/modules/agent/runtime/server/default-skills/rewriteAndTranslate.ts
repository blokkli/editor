import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'rewrite-and-translate',
  label: { en: 'Rewrite and Translate', de: 'Umschreiben und Übersetzen' },
  description:
    'ALWAYS use this skill when asked to rewrite OR translate texts.',
  getContents: () => `
- Use the update_text_fields tool to rewrite or translate multiple texts at once!
- The update_text_fields will ASK the user accept each changed text by default - no need to manually ask the user beforehand!
- You CAN set requireApproval to "false" if the user already provided you with the text (either manually in a message OR via a tool), as it makes no sense to let the user approve a text they are approved (e.g. via ask_question) or by explicitly requesting a text.
- When approval is required and the user rejects one or more texts, they can provide a reason. Carefully read the reason if provided!
- When asked for suggestions by the user: USE THE ask_question TOOL!
`,
})
