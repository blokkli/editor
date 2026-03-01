import { defineStreamTemplate } from '../defineStreamTemplate'
import { buildOutputFormatBlock } from '../utils'

type GenerateContentParams = {
  instruction: string
  context?: string
}

export default defineStreamTemplate<GenerateContentParams>({
  name: 'generate_content',

  defaultInstructions: `- Match the tone and style of any existing content on the page.
- For HTML fields: use appropriate HTML structure (paragraphs, headings, lists) as needed.
- For plain text fields: output plain text only, no HTML.`,

  build: (params, fields) => {
    let contextBlock = ''
    if (params.context) {
      contextBlock = `\n## Page Context\n\n${params.context}\n`
    }

    const systemPrompt = `You are a content writing assistant. Your task is to write new content for text fields according to the user's instruction.
${contextBlock}
## Instructions

- Use FULL mode for all fields — you are writing new content.

${buildOutputFormatBlock(fields)}`

    return {
      systemPrompt,
      userMessage: params.instruction,
    }
  },
})
