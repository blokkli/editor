import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'page-review',
  label: { en: 'Page Review', de: 'Seiten-Review' },
  description:
    'Tool guidance for reviewing page content. Load this IMMEDIATELY AFTER being asked to review, critique, or analyze a page!',
  getContents: () => `
# Page Review - Tool Guide

## Step 1: Get All Content First

**Always start with \`get_all_page_content\`** - this returns all text from every block on the page in a single call.

This gives you:
- A flat list of all blocks with text content
- Each block's uuid, bundle (type), and concatenated text
- Complete page content for analysis

## Step 2: Get Structure If Needed

If you need to understand how blocks are organized:

**Use \`get_child_blocks\`** (without uuid) to see page-level structure:
- Shows which fields exist and what blocks they contain
- Reveals the hierarchy and grouping of content

**Use \`get_child_blocks\` with a uuid** to see a specific block's children.
`,
})
