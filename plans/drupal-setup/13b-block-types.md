# 13b: Block types

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** [14a](14a-demo-concept.md) (done)
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

The block types that an average page of Blockingen/Bloquens is built from, and
the structure blocks for nesting where it makes sense (14a's content model).
Options on block types work end to end. The blocks that reference other hosts
(teaser, contact) come in 13c; chart and embed in 13i.

## Tasks

- [x] **Everyday blocks** ("leaf" blocks: no nested blocks):
  - [x] `title`, `text`, `button`, `video`: from chunk 04. They now only use the
        page's container width at the top level.
  - [x] `image`: caption (`field_caption`, inline); width option; `proxy.vue`
        for the gallery slider
  - [x] `table`: `field_table` with the text format `table`, edited in the
        overlay; option "striped rows"
  - [x] `downloads`: `field_documents` (several documents); name, type and size
  - [x] `gallery`: image blocks as children; grid or slider (proxy mode)
- [x] **Structure blocks:** `section` (heading, background, 1–3 columns),
      `accordion` (one item per block), `columns` (ratio).
- [x] **Allowed types** on every paragraphs field (see Notes).
- [x] **The image credit:** `field_credit` on the image media type, shown on
      every image.
- [x] **Options:**
  - [x] the global option `width`; every block opts into `bkVisibleLanguages`
  - [x] `chunkNames` (the gallery is in `rare`)
  - [x] `schemaOptionsPath` → `drupal/blokkli-options-schema.json`, and
        `schema_file: ../blokkli-options-schema.json`
  - [x] `colorOptions`: moved to 13i (only the charts module uses it)
- [x] **The page's `field_paragraphs`** allows the new types. The other hosts
      get theirs in 13c.
- [x] **Skill:** new `blokkli-add-block-type`.
- [x] **Docs:** the options schema section of
      `docs/modules/drupal/configuration.md` (no validation, path rules), the
      `propsFieldMapping` example in `docs/modules/drupal/blocks.md` and its
      JSDoc (the object form).

## Acceptance criteria

- Every block type of this chunk can be added, edited, nested as 14a allows, and
  rendered in all three languages.
- Every option changes what it claims to, and Drupal's paragraphs widget shows
  and keeps the options from the schema file.
- The skill exists.

## Notes

### The model as built

| Bundle      | Fields                                                                  | Nested field(s)                                       | Translation | Library | `addBehaviour`          |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------- | ----------- | ------- | ----------------------- |
| `image`     | `field_media`, `field_caption` (string_long, translatable)              |                                                       | on          | yes     | form                    |
| `table`     | `field_table` (text_long, format `table`, required, a 3×3 default)      |                                                       | on          | yes     | `editable:field_table`  |
| `downloads` | `field_documents` (media document, unlimited, required, untranslatable) |                                                       | off         | yes     | form                    |
| `gallery`   |                                                                         | `field_paragraphs`: image                             | off         | no      | no-form (`disableEdit`) |
| `section`   | `field_title` (optional heading)                                        | `field_paragraphs`: leaf, gallery, accordion, columns | on          | no      | no-form                 |
| `accordion` | `field_title` (optional)                                                | `field_paragraphs`: leaf, gallery, columns            | on          | no      | `editable:field_title`  |
| `columns`   |                                                                         | `field_left`, `field_right`: leaf                     | off         | no      | no-form (`disableEdit`) |

- **Leaf blocks:** title, text, image, video, button, table and downloads. The
  page allows leaf, gallery, section, accordion, columns, `from_library` and
  `blokkli_fragment`. Library items allow the leaf blocks.
- **Nested paragraphs fields** are unlimited and untranslatable, with one
  storage `field_paragraphs` for gallery, section and accordion.
- **Media image:** `field_credit` (string, untranslatable) in the default and
  media library form displays.
- **Text format `table`:**
  - toolbar `insertTable | link`
  - `filter_html` exactly as the plugins require
  - `use text format table` for `authenticated`
- **Entity mapping `media__document`:** `button/field_link`, then
  `downloads/field_documents`.
- **GraphQL:**
  - the 6 bundles
  - fields `field_caption`, `field_documents`, `field_left`, `field_paragraphs`,
    `field_right`, `field_table`, media `field_credit`, file `filesize`
  - `ParagraphGallery.fieldParagraphs` is `[ParagraphImage]`
- **Frontend:**
  - `Paragraph/fragment.paragraphLeaf.graphql` lists the leaf fragments once.
    Section, accordion, columns, FromLibrary and the `paragraph` union spread
    it; 13c and 13i add their leaf blocks there.
  - `app/helpers/width.ts` maps the width option to classes.
  - `main.css`:
    - `flow` (vertical lists)
    - `editable-placeholder` (empty editables while editing)
    - the accordion sibling rule
    - table styles

### Decisions (2026-09-26), deviating from 14a

- **The gallery holds image blocks,** and **downloads has a multi-value field.**
  - Dropping several media items creates one block each
    (`add_entity_reference_multiple`), and proxy mode only exists for paragraphs
    fields.
  - So several images dropped into a gallery become image blocks.
  - Documents are added through the form (several at once), or one at a time by
    dropping onto the block, which exercises `droppable-field-edit`.
- **Accordion: one item per block.**
  - Consecutive items join visually (`.flow > .accordion + .accordion`), as in
    both reference projects.
  - An accordion holding item blocks would add a nesting level: section >
    accordion > item > columns > text is 5, the limit (F10).
- **Gallery not in columns:** section > accordion > columns > gallery > image
  would be 5 levels. The model goes 4 deep, leaving one level spare.
- **No library conversion for containers** (gallery, section, accordion,
  columns) until 13d has tested "make reusable" on unpublished children (F12).
- **Section heading** (`field_title`): a heading above a multi-column grid spans
  all columns. A one-column section uses the content width, a multi-column one
  the wide width.
- **Table:** no "first column as header" option. CKEditor's header row and
  column make real `<th>` elements, which the planted "table without a header
  row" (14b) relies on.
- **One credit field** instead of author, licence and source, as in both
  reference projects. 14b keeps the full source and licence per file.
- **`width` is a global option** used by image, video and gallery (content,
  wide, full; default content). Chunk 06 rendered images wide.
- **`bkVisibleLanguages` on every block,** not `bkHiddenGlobally`: that one
  overlaps with status and scheduling (13e), and it's client-side only.
- **Options aren't validated by Drupal** (F11). The schema file only feeds
  Drupal's own paragraphs widget.
- **Option labels are English only:** playground-drupal sets no
  `defaultLanguage` (13f).

### Verification (2026-09-26)

- `ddev drush si --existing-config -y`, and `config:status` is clean.
  - The config schema check shows only chunk 04's known gaps.
  - `CKEditor5::validatePair()` and typed-config validation of the table editor
    report nothing.
- **The schema dump** has the 6 types, `MediaImage.fieldCredit` and
  `File.filesize`, and no `…Unexposed` types. Nothing was removed (compared type
  by type against the previous dump).
- **`pbGetFieldConfig`** as admin: the allowed bundles of every field match the
  table. `field_table` is `frame`, `field_caption` `plain`, and
  `field_documents` a droppable reference with cardinality -1.
- **A test page** (section > text + table; accordion > text + columns > text,
  image; a second accordion; a gallery slider; downloads; a wide image):
  - The route query through the Nuxt proxy returns all 15 blocks with their
    options, the credit and the file size.
  - The node edit form shows the options from the schema file. Submitting it
    unchanged keeps every option and adds the default `width` to the nested
    images (harmless).
- **Mutations** as admin:
  - `add` works without a form for table (its default table), section,
    accordion, gallery and columns, and fails for downloads (required field).
  - Adding into a section, `add_entity_reference_multiple` with two images into
    the gallery, and `update_droppable_field` appending a document all work.
    Emptying the documents is refused.
- **The daemon** starts cleanly: all GraphQL documents valid, and "The Drupal
  GraphQL schema supports all features".
- `bun run verify` (in the container) passes all 8 gates.
- **Not verified in the browser** (for the user):
  - adding every type from the add list
  - the table overlay
  - the gallery slider and its proxy list
  - dropping onto downloads
  - the options' effects
  - DE and FR
