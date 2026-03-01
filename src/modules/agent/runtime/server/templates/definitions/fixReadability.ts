import { defineStreamTemplate } from '../defineStreamTemplate'
import { buildOutputFormatBlock } from '../utils'

type FixReadabilityIssue = {
  fieldIndex: number
  text: string
  impact: string
  score: number
}

type FixReadabilityParams = {
  issues: FixReadabilityIssue[]
  scoreLabel?: string
  scoreReference?: string
  retryContext?: string
}

export default defineStreamTemplate<FixReadabilityParams>({
  name: 'fix_readability',

  defaultInstructions: `## How to Fix

- Break long sentences into shorter ones
- Replace complex or uncommon words with simpler alternatives
- Reduce the number of words per sentence
- Maintain the original meaning, tone, and information`,

  build: (params, fields) => {
    const label = params.scoreLabel || 'score'
    const issueList = params.issues
      .map((issue) => {
        return `- Field ${issue.fieldIndex}: "${issue.text}" [impact: ${issue.impact}, ${label}: ${issue.score}]`
      })
      .join('\n')

    const retryBlock = params.retryContext
      ? `\n## Previous Attempt Feedback\n\n${params.retryContext}\n`
      : ''

    const scoreReference = params.scoreReference || ''

    const systemPrompt = `You are a text editing assistant specialized in improving readability.

## Task

Fix ONLY the specific text segments listed below. Do NOT change any other text.

## Flagged Readability Issues

${issueList}
${retryBlock}
${scoreReference}

## Important

- ONLY modify the text segments listed above. Leave everything else untouched.
- Use SEARCH/REPLACE mode. The search text should match or contain the flagged segment.
- If a flagged segment spans an entire field, you may use FULL mode for that field.

${buildOutputFormatBlock(fields)}`

    return {
      systemPrompt,
      userMessage:
        'Fix ONLY the flagged readability issues listed above. Do not change any other text.',
    }
  },
})
