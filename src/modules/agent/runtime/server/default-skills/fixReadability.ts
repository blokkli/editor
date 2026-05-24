import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'assess-and-fix-readability',
  label: { en: 'Fix Readability', de: 'Lesbarkeit verbessern' },
  description:
    'Load this skill when asked to check, fix, or improve readability of texts on the page.',
  tools: [
    'get_readability_issues',
    'check_readability_for_texts',
    'delegate_text_rewrite',
  ],
  getContents: () => `
# Fix Readability

## Step 1: Analyze

Call \`get_readability_issues\` to see current issues. Review the results to decide which fields need fixing.

## Step 2: Fix with \`delegate_text_rewrite\`

Call \`delegate_text_rewrite\` with:
- \`template\`: \`"fix_readability"\`
- \`templateParams\`: \`{}\` (empty — issues are resolved automatically)
- \`fields\`: array of \`{ uuid, fieldName }\` for the fields you want to fix

Include ALL fields that have issues. The tool handles everything automatically:
1. Runs readability analyzers to find issues in the specified fields
2. Streams rewrites to fix them
3. Verifies readability scores on the proposed text
4. If any fields still fail, retries automatically with feedback (up to 3 attempts)
5. Presents the user with before/after readability scores for approval

Example:
\`\`\`json
{
  "template": "fix_readability",
  "templateParams": {},
  "fields": [
    { "uuid": "uuid-1", "fieldName": "field_text" },
    { "uuid": "uuid-2", "fieldName": "title" }
  ]
}
\`\`\`

You do NOT need to pass any issue data, map field indices, or verify results manually. The tool does all of this internally.

## Optional: Pre-check with \`check_readability_for_texts\`

Use \`check_readability_for_texts\` to check readability scores for specific text strings without applying changes. Useful for spot-checks or comparing phrasings.
`,
})
