import { defineBlokkliAgentSkill } from '../skills'

export default defineBlokkliAgentSkill({
  name: 'from-library-reusable-paragraphs',
  label: { en: 'Reusable paragraphs', de: 'Blöcke aus der Bibliothek' },
  description:
    'READ this BEFORE dealing with reusable paragraphs ("from_library"), such as editing a from_library paragraph OR searching one in the library ("Bibliothek", "wiederverwendbar").',
  getContents: () => `
- reusable paragraphs are "global" paragraphs that are shared between multiple pages
- editing them updates them everywhere
- BUT: They can NOT be directly edited on this page!
- This means: You can NOT edit content fields or paragraph fields of a reusable paragraph!
- You CAN however edit their options - editing them ONLY affects the options on THIS current page, because the options are stored on the "from_library" paragraph and they override options from the "global" one.

Internally, a "from_library" paragraph bundle references a special entity called "library_item". This entity contains the actual paragraph.
So basically, if the user wants to "edit a reusable paragraph", you have to guide them to the edit mode of a library item. They can just double click the paragraph to launch a separate blökkli instance.

## Tools
- Use "search_reusable_paragraphs" to find paragraphs from the library
- Use "add_reusable_paragraph" to add a paragraph from the library on the page
- Use "detach_reusable_paragraph" to _detach_ a "from_library" paragraph on the current page. Doing so will copy the reusable paragraph into this page, making it fully editable.
`,
})
