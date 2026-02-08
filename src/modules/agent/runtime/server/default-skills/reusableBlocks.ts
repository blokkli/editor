import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'from-library-reusable-blocks',
  label: { en: 'Reusable Blocks', de: 'Blöcke aus der Bibliothek' },
  description:
    'READ this BEFORE dealing with reusable blocks ("from_library"), such as editing a from_library block OR searching one in the library ("Bibliothek", "wiederverwendbar").',
  getContents: () => `
- reusable blocks are "global" blocks that are shared between multiple pages
- editing them updates them everywhere
- BUT: They can NOT be directly edited on this page!
- This means: You can NOT edit content fields or block fields of a reusable block!
- You CAN however edit their options - editing them ONLY affects the options on THIS current page, because the options are stored on the "from_library" block and they override options from the "global" one.

Internally, a "from_library" block bundle references a special entity called "library_item". This entity contains the actual block.
So basically, if the user wants to "edit a reusable block", you have to guide them to the edit mode of a library item. They can just double click the block to launch a separate blökkli instance.

## Tools
- Use "search_reusable_blocks" to find blocks from the library
- Use "add_reusable_block" to add a block from the library on the page
- Use "detach_reusable_block" to _detach_ a "from_library" block on the current page. Doing so will copy the reusable block into this page, making it fully editable.
`,
})
