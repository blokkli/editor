---
name: blokkli-setup-library
description: >-
  Set up library items (reusable blocks) in a blökkli 2.x + Drupal project:
  paragraphs_library and paragraphs_blokkli_library, the from_library block,
  which types may become library items, the GraphQL exposure, the library search
  provider, translation, permissions, the GraphQL fragment and the library item
  page in Nuxt. Use when editors should reuse a block on several pages (e.g.
  emergency numbers), or when "Add to library" or "From library" is missing or
  empty, library items open a 404, or a container loses its content after being
  made reusable.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/features/library
---

# The library

A library item holds one block that several pages show. Changing the item
changes every page that uses it. The pages hold a `from_library` block that
references the item.

In the editor:

- **"Add to library"** makes a block reusable.
- **"From library"** in the add menu places an item.
- **"Detach from library"** turns a placed item back into a copy of its block.
- **"Edit"** on a placed item opens the item's own page in a nested editor.

To insert a copy that doesn't stay in sync, use templates instead (the
`blokkli-setup-templates` skill).

The docs: [the library](https://docs.blokk.li/features/library),
[feature detection](https://docs.blokk.li/modules/drupal/configuration#feature-detection).
This skill is the procedure and the traps.

## Before you start

- **Which block types may become library items?** Usually single blocks: a
  table, a text, a contact box. Container blocks (sections, columns) can, but
  see the trap in section 2.
- **Where may library blocks go?** Every paragraphs field that should offer
  "From library", including fields inside containers.

## 1. The modules and the block type

- **Enable** `paragraphs_library` (from Paragraphs; it needs `entity_usage`) and
  `paragraphs_blokkli_library`.
  - `paragraphs_library` brings the library item entity and the `from_library`
    paragraph type with its field `field_reusable_paragraph`.
  - `paragraphs_blokkli_library` adds the settings form below, and moves the
    item's canonical URL to `/blokkli/library-item/{id}`, a path the frontend
    serves.
- **Keep the names** `from_library` and `field_reusable_paragraph`: blökkli's
  mutations use them.
- **Allow `from_library`** in every paragraphs field where library blocks may
  go, including fields of containers. The "From library" dialog then offers the
  items whose block type the field also allows.
- **Translation:** on a multilingual site, enable content translation for
  library items (`/admin/config/regional/content-language`). Then the editor
  translates an item as it translates a page, and the item's label is
  translatable.
- Export the config (`drush cex`).

## 2. Which types may become library items

At `/admin/config/content/blokkli/library` check the types. The setting is
`third_party_settings.paragraphs_library.allow_library_conversion` on the
paragraph type. It decides both:

- which blocks offer "Add to library"
- which types a library item may hold

**The trap: containers.** Making a container reusable (a section, columns, an
accordion) loses the changes made inside it since the last publish:

- Blocks added to it, or moved into it, are gone after publishing.
- Blocks removed or moved out come back.
- A container that was never published ends up empty.

Only enable containers if editors publish first, and tell the developer. Single
blocks are safe.

## 3. GraphQL

On the GraphQL server (`/admin/config/graphql`, schema "Core Composable"):

- **Extensions:** `paragraphs_blokkli_library`.
- **`enabled_entity_types`:** `paragraphs_library_item`.
- **`bundles`:** `paragraphs_library_item` for the item, `from_library` for
  paragraphs.
- **`fields`:** `paragraphs` of the item, `field_reusable_paragraph` of
  `from_library`. The item's `label` comes from `entity_base_fields`.

Then update the schema in Nuxt. Without the type `ParagraphFromLibrary`, the
Drupal module disables the library. Library items are always enabled for
blökkli: they need no entry in the enabled types.

## 4. The search provider

The "From library" dialog lists items through a search provider. **Without one,
the dialog is empty, and nothing reports an error.**

At `/admin/config/content/blokkli/search/add` add one:

- search type "Paragraphs library items"
- plugin "Entity Query Library Items"

Export the config. The provider filters by the field's allowed types only:

- It shows the items' labels in their source language.
- It shows unpublished items to users who may see them.

## 5. Permissions

Tell the developer who needs which permissions; don't assign them:

| Task                                          | Permission                      |
| --------------------------------------------- | ------------------------------- |
| "Add to library"                              | `create paragraph library item` |
| Edit an item (its page)                       | `edit paragraph library item`   |
| Delete items, see unpublished ones, revisions | `administer paragraphs library` |

Placing and detaching items needs only blökkli's edit state permissions.

## 6. The GraphQL fragment

blökkli renders `from_library` with its own component, which expects this shape:

```graphql
fragment paragraphFromLibrary on ParagraphFromLibrary {
  libraryItem: fieldReusableParagraph {
    uuid
    label
    block: paragraphs {
      ...paragraphsFieldItem
      props {
        ...paragraphText
        ...paragraphTable
        ...paragraphContact
      }
    }
  }
}
```

- **Keep the aliases:** `libraryItem`, `uuid`, `label` and `block`.
- **Spread the fragment** of every type that may become a library item.
- **Don't spread the `paragraph` fragment** there: it contains
  `paragraphFromLibrary`, and GraphQL rejects the cycle. A container spread
  there must not spread `paragraphFromLibrary` either.
- **Spread `...paragraphFromLibrary`** in the `paragraph` fragment, and in every
  container's fragment whose field allows `from_library`.

## 7. The library item page

"Edit" on a library block opens the item's page, which blökkli expects at
`blokkli/library-item/<uuid>`, behind the language prefix if the site has one.

**Drupal links to the same page with the id**: `/blokkli/library-item/{id}`.
These links appear in open editing, the language switch, the list of edit states
when publishing, and notifications. So the page must load by either:

```graphql
query libraryItem($id: ID!, $uuid: String!, $byId: Boolean!) {
  byId: entityById(entityType: PARAGRAPHS_LIBRARY_ITEM, id: $id)
    @include(if: $byId) {
    ...libraryItemPage
  }
  byUuid: entityByUuid(entityType: PARAGRAPHS_LIBRARY_ITEM, uuid: $uuid)
    @skip(if: $byId) {
    ...libraryItemPage
  }
}

fragment libraryItemPage on ParagraphsLibraryItem {
  uuid
  libraryItemLabel: label
  blokkliProps {
    ...blokkliProps
  }
  paragraphs {
    ...paragraphsFieldItem
    props {
      ...paragraph
    }
  }
}
```

The page, e.g. `pages/[lang]/blokkli/library-item/[uuid].vue`:

```vue
<template>
  <BlokkliProvider
    v-if="item"
    v-slot="{ entity }"
    v-bind="item.blokkliProps"
    :entity="item"
  >
    <h1 v-blokkli-editable:label>{{ entity.libraryItemLabel }}</h1>
    <BlokkliField name="paragraphs" :list="item.paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { LibraryItemPageFragment } from '#graphql-operations'

const param = String(useRoute().params.uuid)
const byId = /^\d+$/.test(param)

const { data } = await useAsyncGraphqlQuery('libraryItem', {
  id: param,
  uuid: param,
  byId,
})

const item = computed(() => {
  const entity = byId ? data.value?.data.byId : data.value?.data.byUuid
  return entity && 'blokkliProps' in entity
    ? (entity as LibraryItemPageFragment)
    : null
})

if (!item.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
```

- **No language argument:** the endpoint's language applies, and the item comes
  in that translation.
- **The label:** add `libraryItemLabel: label` to the app's `pbMutatedEntity`
  fragment, so that editing it shows at once.
- The web server or proxy must send the path, with the language prefix, to Nuxt.

## 8. Options and languages

- **Options** of a placed item are stored per placement, on its `from_library`
  block. The item's own options are the defaults.
- **Global options such as "Visible languages"** have no effect on library
  blocks.
- **"Add to library"** creates the item in the page's source language, with a
  translation for each language of the block. Every translation starts with the
  source label: translate it on the item's page in that language.

## 9. Check the result

1. **The schema** has `ParagraphFromLibrary` and `ParagraphsLibraryItem`.
2. **The Nuxt dev server's log** doesn't list the library among the disabled
   features.
3. **In the browser, as an editor** (not user 1):
   - "Add to library" on a block, then publish. The item exists after
     publishing, not before.
   - "From library" in another field, including one inside a container
   - "Edit" opens the item's page. Change it and publish: every page shows the
     change.
   - open an item from Drupal's list of library items: the page renders
   - switch the language on the item's page
   - "Detach from library", then publish

## Symptoms and causes

| Symptom                                                                                   | Cause                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The "From library" dialog is empty                                                        | No search provider of type "Paragraphs library items", or no item's block type is allowed in the field                                 |
| A new item isn't in the dialog                                                            | Items are created when the page is published                                                                                           |
| No "Add to library" on a block                                                            | The type isn't allowed as a library item, `from_library` isn't allowed in the field, or the user lacks `create paragraph library item` |
| No library features at all                                                                | `ParagraphFromLibrary` isn't in the schema (the bundle or the extension is missing)                                                    |
| `Cycle` or `Cannot spread fragment` errors for `paragraphFromLibrary`                     | The fragment spreads `paragraph`, or a container spread there spreads `paragraphFromLibrary`                                           |
| A library block renders nothing                                                           | The block's type isn't spread in `paragraphFromLibrary`, or the item is unpublished                                                    |
| The item's page is a 404 from Drupal's links (open editing, language switch)              | The page only loads by uuid; Drupal links with the id                                                                                  |
| A container's content is lost or reverted after "Add to library"                          | It had unpublished changes (section 2)                                                                                                 |
| The item's label is in the source language on a translated page                           | Each translation starts with the source label                                                                                          |
| Saving the host's form fails: "The Reusable paragraph field cannot contain a … paragraph" | A library block holds a type the field doesn't allow                                                                                   |
