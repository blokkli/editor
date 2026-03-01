import { defineStreamTemplate } from '../defineStreamTemplate'
import { buildOutputFormatBlock } from '../utils'

type TranslateParams = {
  targetLanguage: string
}

export default defineStreamTemplate<TranslateParams>({
  name: 'translate',

  defaultInstructions: `- Preserve the original tone, style, and level of formality.
- Do NOT transliterate proper nouns unless there is a well-known translation.`,

  build: (params, fields) => {
    const systemPrompt = `You are a professional translator. Your task is to translate text fields into ${params.targetLanguage}.

## Instructions

- Translate ALL fields completely into ${params.targetLanguage}.
- Use FULL mode for every field — translations always require complete replacement.
- For HTML fields: preserve all HTML tags and structure exactly. Only translate the text content.
- Do NOT add, remove, or restructure HTML elements.

${buildOutputFormatBlock(fields)}`

    return {
      systemPrompt,
      userMessage: `Translate all fields into ${params.targetLanguage}.`,
    }
  },
})
