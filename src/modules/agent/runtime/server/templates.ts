type FieldInput = {
  uuid: string
  fieldName: string
  currentValue: string
  fieldType: 'plain' | 'markup'
}

type FixReadabilityIssue = {
  fieldIndex: number
  text: string
  impact: string
  scores: Record<string, number>
}

type FixReadabilityParams = {
  issues: FixReadabilityIssue[]
  retryContext?: string
}

type TranslateParams = {
  targetLanguage: string
}

type RewriteParams = {
  instruction: string
}

type GenerateContentParams = {
  instruction: string
  context?: string
}

export type TemplateCall =
  | { template: 'fix_readability'; templateParams: FixReadabilityParams }
  | { template: 'translate'; templateParams: TranslateParams }
  | { template: 'rewrite'; templateParams: RewriteParams }
  | { template: 'generate_content'; templateParams: GenerateContentParams }

/**
 * Build the output format docs and field listings shared by all templates.
 */
function buildOutputFormatBlock(fields: FieldInput[]): string {
  const fieldDescriptions = fields
    .map((f, i) => {
      const typeLabel = f.fieldType === 'plain' ? 'plain text' : 'HTML'
      const hasContent = f.currentValue.trim().length > 0
      if (hasContent) {
        return `${i}. Type: ${typeLabel}\n   Current value:\n   ${f.currentValue}`
      }
      return `${i}. Type: ${typeLabel}\n   (empty — write new content)`
    })
    .join('\n\n')

  return `## Output Format

Use a search-and-replace format to output only the changed portions. There are two modes:

Search/Replace mode — for targeted edits (typo fixes, small rewrites):

[[[FIELD:0]]]
[[[SEARCH]]]
misspelled word
[[[REPLACE]]]
correctly spelled word

Multiple search/replace pairs per field are allowed:

[[[FIELD:0]]]
[[[SEARCH]]]
first error
[[[REPLACE]]]
first fix
[[[SEARCH]]]
second error
[[[REPLACE]]]
second fix

Full mode — for translations, complete rewrites, or empty fields:

[[[FIELD:2]]]
[[[FULL]]]
The complete new value for this field...

Mixed example (search/replace in one field, full replacement in another):

[[[FIELD:0]]]
[[[SEARCH]]]
mispelled
[[[REPLACE]]]
misspelled
[[[FIELD:3]]]
[[[FULL]]]
Der übersetzte Text...

## Rules

- Use [[[FIELD:N]]] to start edits for the field at 0-based index N.
- Only include fields that need changes. Omit unchanged fields entirely.
- Choose the mode per field:
  - Use [[[SEARCH]]] / [[[REPLACE]]] for targeted edits (typo fixes, small changes). Keep the search text minimal — just the word or phrase being changed. Only add surrounding context if the search text appears multiple times in the field and needs disambiguation.
  - Use [[[FULL]]] for translations, complete rewrites, or when writing content for empty fields.
- For "plain text" fields: output plain text only, NO HTML tags.
- For "HTML" fields: output valid HTML. Preserve the HTML structure (tags like <p>, <ul>, <li>, <h2>, etc.). Do NOT add wrapper elements that weren't there before.
- Do NOT output anything before the first [[[FIELD:N]]] marker or after the last field's content.
- Do NOT add any commentary, explanations, or markdown formatting. Output ONLY the raw markers and field content, nothing else.

## Fields

${fieldDescriptions}`
}

function buildFixReadability(
  params: FixReadabilityParams,
  fields: FieldInput[],
): { systemPrompt: string; userMessage: string } {
  const issueList = params.issues
    .map((issue) => {
      const scoreEntries = Object.entries(issue.scores)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      return `- Field ${issue.fieldIndex}: "${issue.text}" [impact: ${issue.impact}, scores: ${scoreEntries}]`
    })
    .join('\n')

  const retryBlock = params.retryContext
    ? `\n## Previous Attempt Feedback\n\n${params.retryContext}\n`
    : ''

  const systemPrompt = `You are a text editing assistant specialized in improving readability.

## Task

Fix ONLY the specific text segments listed below. Do NOT change any other text.

## Flagged Readability Issues

${issueList}
${retryBlock}
## LIX Score Reference

- Below 25: Very easy (children's books)
- 25–40: Easy (simple articles)
- 40–50: Medium (newspapers)
- 50–60: Difficult (official documents)
- Above 60: Very difficult — this is what gets flagged
- Above 70: Critical — must be simplified

## How to Fix

- Break long sentences into shorter ones
- Replace complex or uncommon words with simpler alternatives
- Reduce the number of words per sentence
- Maintain the original meaning, tone, and information

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
}

function buildTranslate(
  params: TranslateParams,
  fields: FieldInput[],
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a professional translator. Your task is to translate text fields into ${params.targetLanguage}.

## Instructions

- Translate ALL fields completely into ${params.targetLanguage}.
- Use FULL mode for every field — translations always require complete replacement.
- Preserve the original tone, style, and level of formality.
- For HTML fields: preserve all HTML tags and structure exactly. Only translate the text content.
- Do NOT add, remove, or restructure HTML elements.
- Do NOT transliterate proper nouns unless there is a well-known translation.

${buildOutputFormatBlock(fields)}`

  return {
    systemPrompt,
    userMessage: `Translate all fields into ${params.targetLanguage}.`,
  }
}

function buildRewrite(
  params: RewriteParams,
  fields: FieldInput[],
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a text editing assistant. Your task is to write or transform text fields according to the user's instruction.

${buildOutputFormatBlock(fields)}`

  return {
    systemPrompt,
    userMessage: params.instruction,
  }
}

function buildGenerateContent(
  params: GenerateContentParams,
  fields: FieldInput[],
): { systemPrompt: string; userMessage: string } {
  let contextBlock = ''
  if (params.context) {
    contextBlock = `\n## Page Context\n\n${params.context}\n`
  }

  const systemPrompt = `You are a content writing assistant. Your task is to write new content for text fields according to the user's instruction.
${contextBlock}
## Instructions

- Use FULL mode for all fields — you are writing new content.
- Match the tone and style of any existing content on the page.
- For HTML fields: use appropriate HTML structure (paragraphs, headings, lists) as needed.
- For plain text fields: output plain text only, no HTML.

${buildOutputFormatBlock(fields)}`

  return {
    systemPrompt,
    userMessage: params.instruction,
  }
}

/**
 * Resolve a template call into a system prompt and user message
 * for the streaming sub-agent. Optionally includes additional context
 * from skills that provide stream context for the given template.
 */
export function resolveTemplate(
  call: TemplateCall,
  fields: FieldInput[],
  skillContext?: string,
): { systemPrompt: string; userMessage: string } {
  let result: { systemPrompt: string; userMessage: string }

  switch (call.template) {
    case 'fix_readability':
      result = buildFixReadability(call.templateParams, fields)
      break
    case 'translate':
      result = buildTranslate(call.templateParams, fields)
      break
    case 'rewrite':
      result = buildRewrite(call.templateParams, fields)
      break
    case 'generate_content':
      result = buildGenerateContent(call.templateParams, fields)
      break
  }

  if (skillContext) {
    result.systemPrompt += '\n\n' + skillContext
  }

  return result
}
