import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'architecture',
  title: 'Architecture',
  weight: 200,
  getPrompt: () => {
    return `- blökkli is an interactive page builder to manage complex content blocks
- Everything is an "entity" that always has an "entity type", "entity bundle" and "uuid"
- The "page" itself is a separate entity type, e.g. "content" or "node"
- A block can be placed in "block fields"
- A field can restrict which block bundles it allows or how many blocks are allowed (cardinality)
- A cardinality of -1 means: no limit on number of blocks, 1 = one block, 2 = two blocks, etc.
- Both the page and block bundles themselves can have fields to place nested blocks
- A block always has a "parent". This consists of:
  - type: The entity type of the "parent"
  - uuid: The UUID of the "parent"
  - field: The name of the field the block is in
- Blocks can have "content fields" — fields that hold content values. There are four types:
  - **plain**: Plain text (no HTML)
  - **markup**: Rich text / HTML
  - **reference**: Entity reference (media, nodes, etc.)
  - **link**: Link field
- Blocks can have "options", such as "backgroundColor" or "showLink". They make it possible to change the appearance or behaviour of a block.
- The available options change based on various factors, such as the value of other options, the specific state of the block's field values, etc. Always first check which options are available.

### History and Undo/Redo
- blökkli maintains a history of all changes (undo/redo)
- All query tools reflect the **current** history state
- This works exactly like any history implementation:
  - When navigating back in history (undo), all changes are reverted and none of the mutations past that index are applied
  - When navigating forward (redo), changes will be re-applied
  - When navigating back **and then** adding a new mutation, ALL mutations past that index are removed; you can not navigate forward anymore`
  },
})
