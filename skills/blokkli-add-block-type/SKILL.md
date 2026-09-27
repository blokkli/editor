---
name: blokkli-add-block-type
description: >-
  Add a block type (a paragraph type) to a blökkli + Drupal project: the bundle,
  its fields, form display, allowed types, translation and GraphQL exposure in
  Drupal, then the Nuxt component, its fragment, options and editor behaviour.
  Covers blocks that hold other blocks, proxy mode, multi-value media fields,
  blocks that reference content (teasers, contact boxes) and rich text with its
  own text format (e.g. tables). Use when adding, changing or removing a block
  type, when a new bundle doesn't appear in the schema or the editor, when a
  block can't be added, or when options, nesting or dropping media or search
  results don't behave.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module, paragraphs_blokkli 2.x,
  graphql_core_schema and nuxt-graphql-middleware, plus access to the Drupal
  backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.1.1'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/blocks
---

# Adding a block type

A block type spans Drupal config, the GraphQL server and the Nuxt app. The order
is always the same: Drupal, then the schema, then the component. The GraphQL
type doesn't exist until the bundle is exposed and the schema is updated, and a
fragment written before that fails with an error that points at the fragment,
not the cause.

Most mistakes here fail silently: the block is missing from the editor, an
option isn't saved, a field is absent from the schema. Section 10 says how to
check each part.

The docs cover the building blocks:
[blocks with Drupal](https://docs.blokk.li/modules/drupal/blocks),
[`defineBlokkli`](https://docs.blokk.li/define-blokkli),
[options](https://docs.blokk.li/define-blokkli/options),
[`BlokkliField`](https://docs.blokk.li/components/BlokkliField) and
[proxy mode](https://docs.blokk.li/define-blokkli/proxy-mode). This skill is the
procedure and the traps.

## Before you start

Decide, from the design or by asking:

- **Paragraph type or fragment?** A block with no fields of its own (it lists
  data from elsewhere, or is only markup) is a blökkli fragment:
  `defineBlokkliFragment`, stored in the shared `blokkli_fragment` paragraph
  type, so it needs no bundle of its own. See the `blokkli-setup-fragments`
  skill. The rest of this skill is about paragraph types.
- **The fields:** what the editor types or picks. Reuse an existing field
  storage when the type fits (`field.storage.paragraph.*` in the config
  directory): every new storage needs its own entry in the GraphQL server.
- **What's edited in place:** plain text (`string`, `string_long`) and rich text
  (`text_long`) can be edited inline, media and references by dropping.
  Everything else goes through the Drupal form.
- **Where the block is allowed:** which paragraphs fields (the page, inside
  other blocks, library items).
- **Options:** layout choices such as a width or a background. Options aren't
  translatable: anything an editor types belongs in a field.

## 1. The bundle and its fields

Create them in the Drupal UI or with a script, then `drush cex`. Check:

- **The `paragraphs_blokkli_data` behavior** is enabled on the paragraph type.
  blökkli stores options there. Without it, options are silently lost on save.

  ```yaml
  # paragraphs.paragraphs_type.<bundle>.yml
  behavior_plugins:
    paragraphs_blokkli_data:
      enabled: true
  ```

- **Library items:**
  `third_party_settings.paragraphs_library.allow_library_conversion: true` makes
  the type available in library items and offers "Add to library" in the editor.
  For blocks that hold other blocks, see section 7 first, and the
  `blokkli-setup-library` skill.
- **`translatable` on every field, explicitly.** Fields created through the API
  are translatable by default:
  - Text an editor types: translatable.
  - Media references: usually not, since the media entity is translated itself.
  - Paragraphs fields: never (section 7).
- **Translation:** if the bundle has translatable fields, enable content
  translation for it (`language.content_settings.paragraph.<bundle>`).
- **A form display widget for every field.** The editor's forms use the form
  display, including the overlay that edits a single rich text field. A field
  without a widget can't be edited, and a required field without a widget makes
  the block impossible to add. Hide `created` and `status`.
- **Required fields:** see `addBehaviour` in section 5. A default value on the
  field counts as filled.

If the project uses per-type permissions (e.g. `paragraphs_type_permissions`),
editors need the new type's permissions. Tell the developer which ones; don't
assign them yourself.

## 2. Where the block is allowed

- **Every paragraphs field** that should accept the block lists it in
  `handler_settings.target_bundles`, with `negate: 0`. blökkli reads
  `target_bundles` only:
  - A field that allows "all types" (empty `target_bundles`) is reported as
    allowing none.
  - `negate` is ignored.
- **Library items** take their allowed types from `allow_library_conversion`,
  not from a field.
- **Templates** allow every type.
- The editor's add list offers the types allowed in the page's fields plus one
  level of nesting. A type that's only allowed deeper is only reachable in a
  selected container.

## 3. GraphQL

In the graphql_core_schema server (`/admin/config/graphql`, or
`graphql.graphql_servers.<id>.yml`):

```yaml
schema_configuration:
  core_composable:
    bundles:
      paragraph:
        <bundle>:
          enabled: true # or the type is "…Unexposed"
    fields:
      paragraph:
        field_<name>: field_<name> # every new storage, per entity type
```

- Fields are enabled per entity type, not per bundle: a reused storage needs no
  new entry. Media fields go under `media`, file fields (e.g. `filesize`) under
  `file`.
- **How fields are typed:**

  | Field                                  | GraphQL type                               |
  | -------------------------------------- | ------------------------------------------ |
  | `string`, `string_long`                | `String`                                   |
  | `text_long`                            | `String`, the processed HTML               |
  | any field with several values          | a list                                     |
  | a reference allowing one bundle        | that bundle's type, e.g. `[MediaDocument]` |
  | a reference allowing several bundles   | the interface, e.g. `[Media]`              |
  | a paragraphs field allowing one bundle | that type, e.g. `[ParagraphImage]`         |
  | a paragraphs field allowing several    | `[Paragraph]`                              |

  Allowing a second bundle later changes a field's type. Update the fragments
  and regenerate the types.

- **Update the schema:** `drush cr`, then dump or download it as the project
  does (the blokkli-setup-drupal skill, section 7), then restart Nuxt. The
  Drupal module reads the schema at startup.

## 4. Entity mappings: media and content

Entity mappings (`/admin/config/content/blokkli/entity-mapping`) map an entity
bundle (a media type, a content type) to a paragraph bundle and field. They make
dropping create the block: from the media library, from search results, and
pasted files.

**Media:**

- **Several mappings for one media bundle:** when the target field allows more
  than one of them, the editor asks which block to create.
- **One block per dropped item.** Dropping several media items creates one block
  each, even if the mapped field takes several values. A multi-value field is
  filled in one of two ways:
  - through the form: the media library widget selects several at once
  - by dropping onto the field of an existing block, one item at a time (a
    `v-blokkli-droppable` on a field with several values)
- **Every media bundle in the media library needs a mapping,** or the library
  doesn't list it.

**Content** (e.g. a teaser that shows a page, or a contact box that shows an
office):

- **The field:**
  - an `entity_reference` whose allowed bundles include every mapped bundle
    (e.g. `node:news` → `teaser.field_node`)
  - A link field works too, but blökkli sets its title to the block's label.
- **A dropped search result** creates the block with the reference set, without
  the form, even if the field is required. Dropping needs a search provider for
  the entity type (`paragraphs_blokkli_search`, e.g. its `entity_query` plugin).
- **Replacing the reference:** a `v-blokkli-droppable:<field>` on a single-value
  reference lets editors drop a search result onto the block. Such a droppable
  gets no hover and no double-click.
- **GraphQL:**
  - A field that allows one bundle is typed as that bundle (`NodeOffice`).
    Several bundles give the interface (`Node`), with inline fragments per
    bundle.
  - Give the reference an alias that no other block uses with another type (e.g.
    `node`, `office`), since all blocks share one selection.
- **An unpublished or deleted target** is `null` for users without access.
  Render nothing outside the editor and a hint while editing, on an element that
  still carries the droppable, so that the reference can be replaced.

## 5. The component

`components/Paragraph/<Pascal>/index.vue` and `fragment.graphql`, e.g. for
`table`:

```graphql
fragment paragraphTable on ParagraphTable {
  table: fieldTable
}
```

```vue
<template>
  <div
    v-blokkli-editable:field_table
    class="rich-text"
    :class="{ 'is-striped': options.striped }"
    v-html="table"
  />
</template>

<script lang="ts" setup>
import type { ParagraphTableFragment } from '#graphql-operations'

defineProps<ParagraphTableFragment>()

const { options } = defineBlokkli({
  bundle: 'table',
  options: {
    striped: { type: 'checkbox', label: 'Striped rows', default: false },
  },
  editor: {
    addBehaviour: 'editable:field_table',
    icon: 'bk_mdi_table',
    editTitle: (el) => el.querySelector('th, td')?.textContent,
  },
})
</script>
```

- **The fragment name** is `paragraph<Pascal>` on `Paragraph<Pascal>`. The
  Drupal module derives the props type `Paragraph<Pascal>Fragment` from the
  bundle. A different name typechecks, and then the component gets `undefined`
  props.
- **Spread the fragment** into:
  - the `paragraph` union fragment, which must contain every bundle: the Drupal
    module's own queries use it for the editor's state
  - every fragment of a block that may hold it (section 7), and the library
    item's fragment if library items may hold it
- **Aliases must agree across fragments.** They're merged into one selection, so
  the same alias must have the same type everywhere.
- **`defineBlokkli` is read at build time:**
  - The object is a static literal: no variables from outside.
  - Functions under `editor` must not use anything from the module scope. They
    are moved into the editor bundle and throw "… is not defined" when the
    editor opens.
- **One root element, and no comment beside it.** blökkli sets its attributes
  and classes on the block's root element.
- **Editing in place:**
  - `v-blokkli-editable:<field>` on a `string` field edits it inline.
  - On a `text_long` field, it opens CKEditor in an overlay, with the field's
    text format.
  - `v-blokkli-droppable:<field>` accepts media or content dropped onto a
    reference field.
  - Fields without a directive are edited through the form.
- **`addBehaviour`:**

  | Value              | Adding the block                                                        |
  | ------------------ | ----------------------------------------------------------------------- |
  | `form` (default)   | opens the Drupal form. Needed if a required field has no default value. |
  | `no-form`          | adds it directly                                                        |
  | `editable:<field>` | adds it directly, then opens inline editing of the field                |
  - Adding without the form validates the new paragraph: a required field
    without a default value makes it fail.
  - For `editable:<field>`, the element with the directive must exist right
    after adding. Render it while editing even when it's empty, with a
    placeholder so it has a size.
  - `editor.disableEdit: true` removes "Edit" and double-click editing, and adds
    the block without the form. Use it for blocks without fields of their own.

- **`editor.icon`:** `bk_mdi_<name>` from Material Symbols (rounded). A name
  that doesn't exist is reported at build time.
- **`editTitle`** labels the block in the structure view and in selections, and
  `editor.previewWidth` sets the width of standalone previews (the library and
  fragment dialogs).
- **Editor-only code:** use `import.meta.blokkliEditing`, a build-time constant,
  instead of `isEditing` from `defineBlokkli`, which is deprecated.

## 6. Options

- **Types:** checkbox, checkboxes, radios (shown as radios, a grid, colours or
  icons), text, number, range, color, datetime-local and json
  ([options](https://docs.blokk.li/define-blokkli/options)).
- **Stored as strings** in the paragraph's behavior settings. The component gets
  typed values.
- **Not translatable:** one value for every language.
- **Global options** are defined once in `nuxt.config.ts`
  (`blokkli.globalOptions`) for options several block types share. A block opts
  in by name.
  - The built-in `bkVisibleLanguages` (show the block only in some languages)
    and `bkHiddenGlobally` are global options too, and also need opting in
    ([built-in options](https://docs.blokk.li/define-blokkli/built-in-options)).
  - They currently have no effect on blocks placed from the library.

  ```ts
  defineBlokkli({
    bundle: 'image',
    globalOptions: ['width', 'bkVisibleLanguages'],
    editor: {
      // Return every visible option, as a literal array per branch.
      determineVisibleOptions: (ctx) => (ctx.parentType ? [] : ['width']),
    },
  })
  ```

- **Map option values to classes in the component** (a static object). A radios
  option's `class` or `hex` only colours its swatch in the editor. Tailwind only
  finds classes in the files it scans.
- **The schema file for Drupal** (`schemaOptionsPath` in Nuxt, `schema_file` in
  `paragraphs_blokkli.settings`):
  - It's only for Drupal's own paragraphs widget, e.g. on the node edit form.
    The editor doesn't need it, and Drupal doesn't validate option values
    against it.
  - Use an absolute `schemaOptionsPath`: a relative one resolves against Nuxt's
    source directory.
  - Drupal uses `schema_file` as it is, so a relative path is relative to the
    web root. If the file is missing, the widget silently shows no options.
  - Commit the file: Nuxt writes it when it starts or builds.
  - Saving through that widget drops falsy values, so avoid option values like
    `'0'` and checkboxes that default to true.

## 7. Blocks that hold blocks

A section, accordion, columns or gallery holds other blocks in a paragraphs
field.

- **Drupal:**
  - an `entity_reference_revisions` field to `paragraph`, unlimited, with
    explicit target bundles
  - **Untranslatable.** Otherwise each translation gets its own list of child
    blocks, which publishing doesn't update. Only the children are translated.
  - One storage (e.g. `field_paragraphs`) can serve several bundles, each
    allowing different types.
- **Depth:** paragraphs_blokkli loads 5 levels of nested paragraphs. Blocks
  deeper than that are lost when the page is published. Keep a level spare.
- **Required fields on nested blocks** are checked when a block is added or
  changed, not when the page is published.
- **Library conversion:** making a container reusable loses the changes made
  inside it since the last publish (the `blokkli-setup-library` skill). Keep
  containers out of the library, or tell editors to publish first.
- **Fragments can't be recursive,** so a container's fragment spreads each
  allowed child's fragment. A shared fragment for the blocks without children
  keeps that in one place:

  ```graphql
  fragment paragraphLeaf on Paragraph {
    ...paragraphTitle
    ...paragraphText
    ...paragraphImage
  }

  fragment paragraphSection on ParagraphSection {
    title: fieldTitle
    paragraphs: fieldParagraphs {
      ...paragraphsFieldItem
      props {
        ...paragraphLeaf
        ...paragraphColumns
      }
    }
  }
  ```

- **The component:**

  ```vue
  <template>
    <section>
      <BlokkliField name="field_paragraphs" :list="paragraphs" />
    </section>
  </template>

  <script lang="ts" setup>
  import type { ParagraphSectionFragment } from '#graphql-operations'

  defineProps<ParagraphSectionFragment>()

  defineBlokkli({
    bundle: 'section',
    propsFieldMapping: {
      title: { type: 'editable', name: 'field_title' },
      paragraphs: { type: 'field', name: 'field_paragraphs' },
    },
    editor: {
      addBehaviour: 'no-form',
    },
  })
  </script>
  ```

  - `propsFieldMapping` maps every prop to its field (`field` for nested blocks,
    `editable`, `droppable`, or `null`), so blökkli can walk the block tree.
  - Children get `parentType` from `defineBlokkli` and can adapt, e.g. drop
    their page-width container when nested.
  - `editor.fieldLayout` arranges several nested fields in the structure view
    (`[['field_left', 'field_right']]`).
  - Blocks without fields of their own get `disableEdit: true`.

## 8. Proxy mode

For a container whose rendering hides its children, such as a slider that shows
one image at a time. The editor then shows the children in a list of their own
while the block is selected, where they can be dragged and edited.

- `<BlokkliField proxy-mode v-slot="{ items }">` inside an element with
  `position: relative`.
- Each child type can have a `proxy.vue` next to its `index.vue`, rendered in
  that list:
  - It gets the same props.
  - It doesn't call `defineBlokkli`.
  - It may use `v-blokkli-droppable` and `v-blokkli-editable`.
- **Render the visible content directly from `items`,** not with
  `<BlokkliItem>`. `items` is the live list while editing. Items rendered with
  `<BlokkliItem>` lose their parent type, and their directives clash with those
  in `proxy.vue`.
- To switch between proxy mode and a normal list with an option, use two
  `BlokkliField`s with `v-if`/`v-else`: `proxy-mode` is read once.
- Proxy mode only exists for paragraphs fields. A single block with a
  multi-value media field can't use it.

## 9. Rich text with its own format

For example a table block: a `text_long` field whose format allows only tables
and links.

- **A text format plus a CKEditor 5 editor.** The format's `filter_html` allowed
  tags must match the enabled CKEditor plugins exactly. The editor form checks
  this; in code, use `CKEditor5::validatePair($editor, $format)`.
  - Toolbar `insertTable` and `link`.
  - Allowed tags:
    `<br> <p> <a href> <table> <tr> <td rowspan colspan> <th rowspan colspan> <thead> <tbody> <tfoot> <caption>`.
  - Header rows and columns come from CKEditor (real `<th>`); no option needed.
- **The field allows only that format** (`allowed_formats`).
- **A default value** (e.g. a small table with a header row) lets the block be
  added with `editable:<field>`.
- **Tell the developer that editors need `use text format <id>`.** Without it,
  the text is saved in the default format, which strips the table.
- **Pasting:** the paste target for rich text is a separate setting
  (`clipboard_text_paragraph`), so a new field doesn't change what pasting
  creates.
- The agent and the translation features see every text field, with or without a
  directive.

## 10. Check the result

1. `drush config:status` is clean after the export.
2. The schema has `Paragraph<Pascal>` with its fields, and no `…Unexposed` type.
3. Nuxt starts without GraphQL errors. The Drupal module's log line lists no
   disabled features.
4. **In the editor, as an editor (not uid 1):**
   - The block is in the add list, with its label and icon.
   - Adding it works as its `addBehaviour` says.
   - Every field can be edited, and every option changes what it claims to.
   - It can be placed wherever it's allowed.
   - Publish, reload: the values survived. Check another language.
   - For containers: drop several media items, open the structure view, and
     place the block in a library item if that's allowed.

Automated tests usually render the published page. They don't open the editor,
so they catch none of the problems above.

## Symptoms and causes

| Symptom                                                                 | Cause                                                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| The block isn't in the add list                                         | Not in the field's `target_bundles`, or only allowed deeper than one level of nesting   |
| `Unknown type "ParagraphXyz"`, or a `…Unexposed` type                   | The bundle is missing from the GraphQL server's `bundles`, or the schema is stale       |
| A field is missing from the schema                                      | The storage is missing from the server's `fields`                                       |
| The component gets `undefined` props                                    | The fragment isn't named `paragraph<Pascal>`, or isn't spread where the block is placed |
| Options are lost on save                                                | The `paragraphs_blokkli_data` behavior isn't enabled on the paragraph type              |
| Adding the block fails without the form                                 | A required field without a default value, or no widget for it in the form display       |
| After adding, inline editing doesn't open                               | The `editable:<field>` element isn't rendered when the field is empty                   |
| "… is not defined" when the editor opens                                | A function under `editor` uses a module-scope variable                                  |
| Vue warns about extraneous attributes; drops around the block misbehave | The component has more than one root node (in development, a comment counts)            |
| Rich text loses its table on save                                       | The editor lacks `use text format <id>`                                                 |
| Dropping several images creates several blocks                          | Expected: one block per item. Drop them into a container instead                        |
| Nested blocks differ between languages                                  | The paragraphs field is translatable                                                    |
| Nested blocks disappear on publish                                      | More than 5 levels of nesting                                                           |
| Drupal's paragraph form shows no options                                | `schema_file` doesn't point at the schema file (relative to the web root)               |
| An option has no effect on a block from the library                     | Global options like `bkVisibleLanguages` don't apply to library blocks                  |
| Dropping a search result fails with "Missing mapping for entity type …" | No entity mapping from that bundle to this block and field                              |
| A search result can't be dropped onto the block to replace it           | No `v-blokkli-droppable` on the reference, or its allowed bundles lack the result's     |
