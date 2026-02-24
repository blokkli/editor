import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'asses-and-fix-readability',
  label: { en: 'Fix Readability', de: 'Lesbarkeit verbessern' },
  description:
    'Load this skill when asked to check, fix, or improve readability of texts on the page.',
  tools: ['get_readability_issues', 'check_readability_for_texts'],
  getContents: () => `
# Fix Readability - Iterative Workflow

Fixing readability is an **iterative process**. You must verify your rewrites actually improved the scores before moving on.

## Step 1: Analyze

Call \`get_readability_issues\` to get current issues.

The result is an object keyed by paragraph UUID, then by field name:
\`\`\`
{
  "<uuid>": {
    "<fieldName>": {
      "fieldValue": "current text",
      "issues": [
        { "text": "flagged segment", "impact": "critical", "scores": { "lix": 85 } }
      ]
    }
  }
}
\`\`\`

- \`fieldValue\` is the full editable field content.
- Each issue is a text segment within the field that was flagged, with its own scores.
- A field can have multiple issues (e.g. a rich text field with several hard-to-read paragraphs).

## Step 2: Pre-check with \`check_readability_for_texts\`

Before applying a rewrite, use \`check_readability_for_texts\` to verify your rewritten text actually scores better. Pass the proposed new text and check that the scores improved compared to the original.

This is cheap and fast — use it to iterate on your wording before committing a rewrite.

## Step 3: Rewrite

Use \`batch_rewrite_text\` to apply the improved texts. The UUID and field name from the analyze result map directly to the batch_rewrite_text input:
\`\`\`
{ "uuids": { "<uuid>": { "<fieldName>": "improved text" } } }
\`\`\`

When rewriting:
- Use shorter sentences and simpler words.
- Keep the original meaning and tone.
- Focus on fields with "critical" and "serious" impact first.

## Step 4: Verify

After the rewrites are applied, call \`get_readability_issues\` **again** to check if the issues are resolved.

- If issues remain: rewrite again with different wording.
- If new issues appeared: fix those too.
- Repeat until no more readability issues are reported.

**Do NOT skip the verification step.** A rewrite can easily make readability worse if sentences become longer or more complex.

## Important

- Always pre-check with \`check_readability_for_texts\` before applying rewrites.
- Always verify with \`get_readability_issues\` after applying rewrites.
- Never assume a rewrite fixed the issue.
- The scores (LIX, CLI, ARI) measure sentence length and word complexity. Lower is easier to read.
- LIX above 60 is flagged. Above 70 is critical.
`,
})
