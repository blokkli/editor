import { defineStreamTemplate } from '../defineStreamTemplate'
import { buildOutputFormatBlock } from '../utils'

type FixReadabilityIssue = {
  fieldIndex: number
  text: string
  impact: string
  score: number
}

type FixReadabilityRetryField = {
  fieldIndex: number
  fieldLabel: string
  originalValue: string
  previousAttempt: string
  score?: number
}

type FixReadabilityParams = {
  issues: FixReadabilityIssue[]
  scoreLabel?: string
  scoreReference?: string
  retryFields?: FixReadabilityRetryField[]
  passingFields?: Array<{
    fieldLabel: string
    value: string
    score?: number
  }>
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

    let retryBlock = ''
    if (params.retryFields && params.retryFields.length > 0) {
      const parts: string[] = ['## Previous Attempt', '']

      if (params.passingFields && params.passingFields.length > 0) {
        parts.push(
          'The following fields were already improved and now have good readability:',
        )
        for (const p of params.passingFields) {
          const truncated =
            p.value.length > 200 ? p.value.slice(0, 200) + '...' : p.value
          const scoreStr =
            p.score != null ? ` (${label}: ${Math.round(p.score)})` : ''
          parts.push(`- "${p.fieldLabel}": "${truncated}"${scoreStr}`)
        }
        parts.push('')
      }

      parts.push(
        'The following fields still have readability issues after your previous rewrite:',
        '',
      )

      for (const rf of params.retryFields) {
        const origTruncated =
          rf.originalValue.length > 500
            ? rf.originalValue.slice(0, 500) + '...'
            : rf.originalValue
        const prevTruncated =
          rf.previousAttempt.length > 500
            ? rf.previousAttempt.slice(0, 500) + '...'
            : rf.previousAttempt

        parts.push(`- Field ${rf.fieldIndex} ("${rf.fieldLabel}"):`)
        parts.push(`  Original text: "${origTruncated}"`)
        parts.push(`  Your previous rewrite: "${prevTruncated}"`)

        // Filter issues belonging to this field.
        const fieldIssues = params.issues.filter(
          (i) => i.fieldIndex === rf.fieldIndex,
        )
        if (fieldIssues.length > 0) {
          parts.push('  Remaining issues:')
          for (const issue of fieldIssues) {
            parts.push(
              `    - "${issue.text}" [impact: ${issue.impact}, ${label}: ${issue.score}]`,
            )
          }
        }
        parts.push('')
      }

      parts.push('Try a different approach:')
      parts.push('- Use shorter sentences (max 10-12 words per sentence)')
      parts.push('- Replace complex or uncommon words with simple alternatives')
      parts.push('- Break compound sentences into multiple simple ones')

      retryBlock = '\n' + parts.join('\n') + '\n'
    }

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
