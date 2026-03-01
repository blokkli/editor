import type { FieldInput } from './types'

/**
 * Build the output format docs and field listings shared by all templates.
 */
export function buildOutputFormatBlock(fields: FieldInput[]): string {
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
