import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'rewrite-and-translate',
  label: { en: 'Rewrite and Translate', de: 'Umschreiben und Übersetzen' },
  description:
    'ALWAYS use this skill when asked to rewrite OR translate texts.',
  tools: ['stream_text_fields', 'update_text_fields'],
  getContents: () => `
## stream_text_fields — Template-Based Streaming

The \`stream_text_fields\` tool uses prompt templates for precise control. Choose the right template:

### \`translate\` template
For translating text fields to another language. Always uses FULL mode.
\`\`\`json
{
  "template": "translate",
  "templateParams": { "targetLanguage": "German" },
  "fields": [{ "uuid": "...", "fieldName": "..." }]
}
\`\`\`

### \`rewrite\` template
For general-purpose rewrites with a free-form instruction.
\`\`\`json
{
  "template": "rewrite",
  "templateParams": { "instruction": "Make more concise and professional" },
  "fields": [{ "uuid": "...", "fieldName": "..." }]
}
\`\`\`

### \`generate_content\` template
For writing new content for empty fields (e.g. after adding blocks). Optionally include page context.
\`\`\`json
{
  "template": "generate_content",
  "templateParams": { "instruction": "Write an introductory paragraph about sustainable energy", "context": "This is a blog post about renewable energy sources." },
  "fields": [{ "uuid": "...", "fieldName": "..." }]
}
\`\`\`

## Guidelines

- Prefer \`stream_text_fields\` when rewriting or translating multiple or large text fields — it streams content live into the page for immediate visual feedback.
- Fall back to \`update_text_fields\` for small/direct text changes where you already have the final values (e.g. fixing a typo, or setting text provided by the user).
- Use \`update_text_fields\` with \`operations\` (search/replace) for small targeted edits like typo fixes — avoids outputting the entire field value.
- Use \`operations\` with \`selector: true\` to target a specific HTML element by CSS selector (e.g. \`p:nth-child(3)\`, \`h2\`, \`li:last-child\`) and replace its innerHTML.
- Use \`update_text_fields\` with \`uuids\` for full rewrites where the entire value changes.
- The \`update_text_fields\` tool can also be used when requireApproval is "false" (e.g. when the user provided the text themselves).
- Both tools will ASK the user to accept each changed text by default - no need to manually ask the user beforehand!
- When the user rejects one or more texts, they can provide a reason. Carefully read the reason if provided!
- When asked for suggestions by the user: USE THE ask_question TOOL!
`,
})
