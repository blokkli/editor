import { defineStreamTemplate } from '../defineStreamTemplate'
import { buildOutputFormatBlock } from '../utils'

type RewriteParams = {
  instruction: string
}

export default defineStreamTemplate<RewriteParams>({
  name: 'rewrite',

  build: (params, fields) => {
    const systemPrompt = `You are a text editing assistant. Your task is to write or transform text fields according to the user's instruction.

${buildOutputFormatBlock(fields)}`

    return {
      systemPrompt,
      userMessage: params.instruction,
    }
  },
})
