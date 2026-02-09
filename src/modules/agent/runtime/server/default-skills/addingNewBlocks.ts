import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'adding-new-blocks',
  label: { en: 'Adding new Blocks', de: 'Neue Blöcke hinzufügen' },
  description:
    'How to add new blocks. LOAD THIS THE FIRST TIME BEFORE CALLING add_blocks!!!',
  getContents: () => `
- Blocks can be NESTED! More often than not a block such as an accordeon, section, grid, etc. will have block fields for nested blocks
- Before adding blocks, THINK how you want to structure them! For example, when asked to "create a section about XYZ", check which block is most appropriate for that
- That block could have multiple block fields!
- You can add multiple blocks using the add_blocks tool.
- Use get_bundle_info to learn which bundles are allowed and what content fields AND block fields they have BEFORE providing values in add_blocks.
- IMPORTANT: When get_bundle_info shows a block has blockFields (like "header", "blocks", "left", "right"), plan your structure so that matching content goes INTO those fields, not as sibling blocks. For example, if a grid has a "header" blockField that allows "title" bundles, create the title INSIDE the grid's header field, not as a separate block alongside the grid.
- PREFERRED: Use the \`children\` property on each block to create entire nested structures in a SINGLE add_blocks call! The \`children\` property is a record keyed by block field name, with arrays of child blocks. Children can also have children (recursive, no depth limit). Example:
  \`\`\`json
  {
    "blocks": [{
      "bundle": "grid",
      "children": {
        "header": [{ "bundle": "title", "contentFields": { "text": "My Grid" } }],
        "blocks": [
          { "bundle": "card", "contentFields": { "title": "Card 1" } },
          { "bundle": "card", "contentFields": { "title": "Card 2" } }
        ]
      }
    }],
    "parent": { ... },
    "afterUuid": null
  }
  \`\`\`
- This is MUCH better than making multiple sequential calls (create parent, get_child_blocks, add children). Use children whenever you know the block field names from get_bundle_info.
- When adding blocks to a NEW parent that you did NOT just create with children, call get_child_blocks first to get the correct parent objects and field names. NEVER construct parent objects manually!
- You SHOULD already provide default content field values if possible!
- You can set block OPTIONS inline via the \`options\` property on each block (key-value pairs). Use get_bundle_info to see which options are available for a bundle. This avoids a separate set_block_options call after creating blocks.
- The add_blocks tool will thoroughly validate your input (including children and options recursively), so it's impossible for you to add invalid blocks.
- If you made a mistake, use the move_blocks to move the newly created blocks if possible or batch_rewrite_text if you need to change text.
`,
})
