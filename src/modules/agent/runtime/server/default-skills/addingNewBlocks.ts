import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'adding-new-blocks',
  label: { en: 'Adding new Blocks', de: 'Neue Blöcke hinzufügen' },
  description:
    'How to add new blocks. LOAD THIS THE FIRST TIME BEFORE CALLING add_blocks!!!',
  getContents: () => `
- You can add multiple blocks using the add_blocks tool
- When you need to create nested structures:
  - First create the root blocks in an add_blocks call
  - Then call add_blocks for the child blocks, using the UUID of the newly created block as the "parent"
- You SHOULD already provide default content values if possible!
- The add_blocks tool will thoroughly validate your input, so it's impossible for you to add invalid blocks.
`,
})
