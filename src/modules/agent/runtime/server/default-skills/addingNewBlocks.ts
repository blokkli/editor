import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'adding-new-blocks',
  label: { en: 'Adding new Blocks', de: 'Neue Blöcke hinzufügen' },
  description:
    'How to add new blocks. LOAD THIS THE FIRST TIME BEFORE CALLING add_blocks!!!',
  getContents: () => `
- You can add multiple blocks using the add_blocks tool.
- When adding blocks to a NEW parent (one you just created), ALWAYS call get_child_blocks first to get the correct parent objects and field names. NEVER construct parent objects manually!
- Use get_bundle_info to learn which bundles are allowed and what content fields they have BEFORE providing values in add_blocks.
- When you need to create nested structures:
  - First create the root blocks in an add_blocks call
  - Then call get_child_blocks on the new block to get its fields and parent objects
  - Then call add_blocks for the child blocks using the parent object from get_child_blocks
- You SHOULD already provide default content values if possible!
- The add_blocks tool will thoroughly validate your input, so it's impossible for you to add invalid blocks.
- If you made a mistake, use the move_blocks to move the newly created blocks if possible or batch_rewrite_text if you need to change text.
`,
})
