# 13b: Block types

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** [14a](14a-demo-concept.md) (done)
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

The block types that an average page of Blockingen/Bloquens is built from, and
the structure blocks for nesting where it makes sense (14a's content model).
Options on block types work end to end, including Drupal's validation against
the options schema. The blocks that reference other hosts (teaser, contact) come
in 13c; chart and embed in 13i.

## Tasks

- [ ] **Everyday blocks** (see 14a's tables):
  - [ ] `title`, `text`, `button`: from chunk 04, unchanged
  - [ ] `image`: add a caption field; option width (content, wide, full)
  - [ ] `video`: from chunk 04; the playable embed comes with 13i
  - [ ] `table`: a text field with its own text format that only allows tables
        and links, edited through the form; options striped and "first column as
        header"
  - [ ] `downloads`: several documents (media type `document`), so that dropping
        several files from the media library works
        (`add_entity_reference_multiple`)
  - [ ] `gallery`: several images; option grid or slider, the slider with proxy
        mode
- [ ] **Structure blocks:**
  - [ ] `section`: holds everyday blocks, accordions and columns; options
        background colour, and its children in 1, 2 or 3 columns
  - [ ] `accordion`: items, each with a title and everyday blocks or columns
        (one paragraph type with nested items, or items as their own type:
        decide here)
  - [ ] `columns`: two paragraph fields (left, right) with everyday blocks;
        option ratio 50/50, 33/66, 66/33
  - [ ] the allowed types on every paragraphs field, so that the deepest path is
        section > accordion > columns > text
- [ ] **The image credit:** a credit on the `image` media type (author, licence,
      source; one field or three, decide here), shown with every image.
- [ ] **Options:**
  - [ ] from chunk 06: `globalOptions`, `colorOptions` and `chunkNames` in
        `playground-drupal/nuxt.config.ts`
  - [ ] `schemaOptionsPath` in `playground-drupal`, and
        `paragraphs_blokkli.settings.schema_file` pointing at that file, as the
        starterkit does
- [ ] **The page's `field_paragraphs`** allows the new types. The other hosts
      get theirs in 13c.
- [ ] **Skill:** new `blokkli-add-block-type`:
  - the Drupal bundle, fields, form and view display, translation settings
  - the allowed types on every paragraphs field, including nested ones and the
    library
  - the GraphQL server's `bundles` and `fields`, the schema update
  - the component, its fragment and the spread in the union
  - `addBehaviour`, the icon, options
  - a fragment instead of a paragraph type, when it has no fields of its own
    (see 13d)

## Acceptance criteria

- Every block type of this chunk can be added, edited, nested as 14a allows, and
  rendered in all three languages.
- Every option changes what it claims to, and Drupal validates options against
  the schema file.
- The skill exists.

## Notes

- **The steps for new block types** are in chunk 13's Notes.
- **Link fields:** keep the link title off and put the text in its own field
  (F9).
- **`schema_file`** in `paragraphs_blokkli.settings` is still empty (chunk 03).
- **Required fields** (F7): a block with a required field can only be added
  through the form. Set `addBehaviour` accordingly.
- **Overlap:** the drupal-zh plugin's `add-paragraph-type` skill covers the same
  ground for Liip projects (Figma, YouTrack, e2e). `blokkli-add-block-type` is
  the generic core that it could build on.
