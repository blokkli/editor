import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'adding-new-paragraphs',
  label: { en: 'Adding new paragraphs', de: 'Neue Blöcke hinzufügen' },
  description:
    'How to add new paragraphs. LOAD THIS THE FIRST TIME BEFORE CALLING add_paragraphs!!!',
  getContents: () => `
- paragraphs can be NESTED! More often than not a paragraph such as an accordeon, section, grid, etc. will have paragraph fields for nested paragraphs
- Before adding paragraphs, THINK how you want to structure them! For example, when asked to "create a section about XYZ", check which paragraph is most appropriate for that
- That paragraph could have multiple paragraph fields!
- You can add multiple paragraphs using the add_paragraphs tool.
- Use get_bundle_info to learn which bundles are allowed and what content fields AND paragraph fields they have BEFORE providing values in add_paragraphs.
- IMPORTANT: When get_bundle_info shows a paragraph has paragraphFields (like "header", "paragraphs", "left", "right"), plan your structure so that matching content goes INTO those fields, not as sibling paragraphs. For example, if a grid has a "header" paragraphField that allows "title" bundles, create the title INSIDE the grid's header field, not as a separate paragraph alongside the grid.
- PREFERRED: Use the \`children\` property on each paragraph to create entire nested structures in a SINGLE add_paragraphs call! The \`children\` property is a record keyed by paragraph field name, with arrays of child paragraphs. Children can also have children (recursive, no depth limit).
- This is MUCH better than making multiple sequential calls (create parent, get_child_paragraphs, add children). Use children whenever you know the paragraph field names from get_bundle_info.
- When adding paragraphs to a NEW parent that you did NOT just create with children, call get_child_paragraphs first to get the correct parent objects and field names. NEVER construct parent objects manually!
- You SHOULD already provide default content field values if possible!
- You can set paragraph OPTIONS inline via the \`options\` property on each paragraph (key-value pairs). Use get_bundle_info to see which options are available for a bundle. This avoids a separate set_paragraph_options call after creating paragraphs.
- The add_paragraphs tool will thoroughly validate your input (including children and options recursively), so it's impossible for you to add invalid paragraphs.
- If you made a mistake, use the move_paragraphs to move the newly created paragraphs if possible or update_text_fields if you need to change text.
`,
})
