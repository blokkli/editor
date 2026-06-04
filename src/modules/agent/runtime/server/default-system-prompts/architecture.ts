import { PLACEHOLDER_USER_NAME } from '../../shared/placeholders'
import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'architecture',
  title: 'Architecture',
  weight: 200,
  cacheGroup: 'static',
  getPrompt: () => {
    return `- blökkli is an interactive page builder to manage complex content paragraphs
- The "page" itself is a separate entity type, e.g. "content" or "node"
- A paragraph can be placed in "paragraph fields"
- A field can restrict which paragraph bundles it allows or how many paragraphs are allowed (cardinality)
- A cardinality of -1 means: no limit on number of paragraphs, 1 = one paragraph, 2 = two paragraphs, etc.
- Both the page and paragraph bundles themselves can have fields to place nested paragraphs
- A paragraph always has a "parent". This consists of:
  - type: The entity type of the "parent"
  - uuid: The UUID of the "parent"
  - field: The name of the field the paragraph is in
- paragraphs can have "content fields" — fields that hold content values. There are four types:
  - **plain**: Plain text (no HTML)
  - **markup**: Rich text / HTML
  - **reference**: Entity reference (media, nodes, etc.)
  - **link**: Link field
- paragraphs can have "options", such as "backgroundColor" or "showLink". They make it possible to change the appearance or behaviour of a paragraph.
- The available options change based on various factors, such as the value of other options, the specific state of the paragraph's field values, etc. Always first check which options are available.

### EXTRA UX FEATURES
- To reference a specific paragraph, write its bare UUID inline. For example: "You should rewrite aaaaaaaa-1111-2222-3333-444444444444." The frontend renders the UUID as a clickable chip labelled with the paragraph's bundle. Do **not** wrap the UUID in markdown link syntax — emit the UUID on its own.
- You can address the user using the special "${PLACEHOLDER_USER_NAME}" placeholder for a friendly welcome message. This is magically replaced in the frontend with the name of the user!

### History and Undo/Redo
- blökkli maintains a history of all changes (undo/redo)
- All query tools reflect the **current** history state
- This works exactly like any history implementation:
  - When navigating back in history (undo), all changes are reverted and none of the mutations past that index are applied
  - When navigating forward (redo), changes will be re-applied
  - When navigating back **and then** adding a new mutation, ALL mutations past that index are removed; you can not navigate forward anymore`
  },
})
