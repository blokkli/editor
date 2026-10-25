---
name: blokkli-setup-library
description: >-
  Set up library items (reusable paragraphs) in a blökkli 2.x + Drupal project:
  paragraphs_library and paragraphs_blokkli_library, the from_library paragraph
  type, which paragraph types may become library items, the GraphQL exposure,
  the library search provider, translation, permissions, the GraphQL fragment
  and the library item page in Nuxt. Use when editors should reuse a paragraph
  on several pages (e.g. emergency numbers), or when "Add to library" or "From
  library" is missing or empty, or library items open a 404.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.5'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/features/library
---

# The library

A library item holds one paragraph that several pages show. Changing the item
changes every page that uses it. The pages hold a `from_library` paragraph that
references the item.

In the editor:

- **"Add to library"** makes a paragraph reusable.
- **"From library"** in the add menu places an item.
- **"Detach from library"** turns a placed item back into a copy of its
  paragraph. The copy is what the item held at that moment: later changes of the
  item don't reach it, also before the page is published.
- **"Edit"** on a placed item opens the item's own page in a nested editor.

To insert a copy that doesn't stay in sync, use templates instead (the
`blokkli-setup-templates` skill).

The docs: [the library](https://docs.blokk.li/features/library),
[feature detection](https://docs.blokk.li/modules/drupal/configuration#feature-detection).
This skill is the procedure and the traps.

## Before you start

- **Which paragraph types may become library items?** Usually ones that don't
  hold other paragraphs: a table, a text, a contact box. Containers (sections,
  columns) can too; their fragments need care (section 6).
- **Where may library items go?** Every paragraphs field that should offer "From
  library", including fields inside containers.

## 1. The modules and the paragraph type

- **Enable** `paragraphs_library` (from Paragraphs; it needs `entity_usage`) and
  `paragraphs_blokkli_library`.
  - `paragraphs_library` brings the library item entity and the `from_library`
    paragraph type with its field `field_reusable_paragraph`.
  - `paragraphs_blokkli_library` adds the settings form below, and moves the
    item's canonical URL to `/blokkli/library-item/{id}`, a path the frontend
    serves.
- **Keep the names** `from_library` and `field_reusable_paragraph`: blökkli's
  mutations use them.
- **Allow `from_library`** in every paragraphs field where library items may go,
  including fields of containers. The "From library" dialog then offers the
  items whose paragraph type the field also allows.
- **Translation:** on a multilingual site, enable content translation for
  library items (`/admin/config/regional/content-language`). Then the editor
  translates an item as it translates a page, and the item's label is
  translatable.
- Export the config (`drush cex`).

## 2. Which paragraph types may become library items

At `/admin/config/content/blokkli/library` check the types. The setting is
`third_party_settings.paragraphs_library.allow_library_conversion` on the
paragraph type. It decides both:

- which paragraphs offer "Add to library". For other types, the request is
  refused as well: "Paragraph type '…' cannot be added to the library."
- which paragraph types a library item may hold

**Containers** (a section, columns, an accordion) take their paragraphs along:
the library item gets the container with the paragraphs that it has in the
editor, published or not.

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

Placing and detaching items needs only blökkli's edit state permissions. A user
places the items that they may view: an unpublished one takes
`administer paragraphs library`.

With per-type permissions (`paragraphs_type_permissions`):

- placing an item needs `create paragraph content from_library`
- detaching one needs `delete paragraph content from_library`, and `create` for
  the type of the item's paragraph: the page gets a copy of it

## 6. The GraphQL fragment

blökkli renders `from_library` with its own component, which expects this shape:

```graphql
fragment paragraphFromLibrary on ParagraphFromLibrary {
  libraryItem: fieldReusableParagraph {
    id
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

- **Keep the aliases:** `libraryItem`, `id`, `uuid`, `label` and `block`.
- **The `id`** builds the link of "Edit" to the item's page: without it, a
  placed item can't be edited.
- **Spread the fragment** of every paragraph type that may become a library
  item.
- **Don't spread the `paragraph` fragment** there: it contains
  `paragraphFromLibrary`, and GraphQL rejects the cycle. A container spread
  there must not spread `paragraphFromLibrary` either.
- **Spread `...paragraphFromLibrary`** in the `paragraph` fragment, and in every
  container's fragment whose field allows `from_library`.

## 7. The library item page

The item's canonical URL is its page: `/blokkli/library-item/{id}`, behind the
language prefix if the site has one. Drupal links there (open editing, the
language switch, the list of edit states when publishing, notifications), and so
does "Edit" on a placed item.

The page, `pages/blokkli/library-item/[id].vue` (with the site's language prefix
in front, if the routes have one):

```vue
<template>
  <BlokkliDrupalEditLibraryItem v-slot="{ entity }" :id>
    <h1 v-blokkli-editable:label>{{ entity.libraryItemLabel }}</h1>
  </BlokkliDrupalEditLibraryItem>
</template>

<script lang="ts" setup>
import BlokkliDrupalEditLibraryItem from '#blokkli/drupal/components/BlokkliDrupalEditLibraryItem/index.vue'

const id = String(useRoute().params.id)
</script>
```

- **The component** loads the item by its id, in the language of the request,
  and renders its paragraph. It answers 404 when the item doesn't exist or the
  user may not view it or use blökkli.
- **The slot** renders above the paragraph, with the item as it is while
  editing.
- **The label:** add `libraryItemLabel: label` to the app's `pbMutatedEntity`
  fragment, so that editing it shows at once.
- The web server or proxy must send the path, with the language prefix, to Nuxt.

## 8. Options and languages

- **Options** of a placed item are stored per placement, on its `from_library`
  paragraph. The item's own options are the defaults.
- **Global options such as "Visible languages"** have no effect on
  `from_library` paragraphs.
- **"Add to library"** creates the item in the page's source language, with a
  translation for each language of the paragraph. Every translation starts with
  the source label: translate it on the item's page in that language.

## 9. Check the result

1. **The schema** has `ParagraphFromLibrary` and `ParagraphsLibraryItem`.
2. **The Nuxt dev server's log** doesn't list the library among the disabled
   features.
3. **In the browser, as an editor** (not user 1):
   - "Add to library" on a paragraph, then publish. The item exists after
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
| The "From library" dialog is empty                                                        | No search provider of type "Paragraphs library items", or no item's paragraph type is allowed in the field                             |
| A new item isn't in the dialog                                                            | Items are created when the page is published                                                                                           |
| No "Add to library" on a paragraph                                                        | The type isn't allowed as a library item, `from_library` isn't allowed in the field, or the user lacks `create paragraph library item` |
| No library features at all                                                                | `ParagraphFromLibrary` isn't in the schema (the bundle or the extension is missing)                                                    |
| `Cycle` or `Cannot spread fragment` errors for `paragraphFromLibrary`                     | The fragment spreads `paragraph`, or a container spread there spreads `paragraphFromLibrary`                                           |
| A placed library item renders nothing                                                     | The item's paragraph type isn't spread in `paragraphFromLibrary`, or the item is unpublished                                           |
| "Edit" on a placed item is disabled: "This reusable block cannot be edited right now."    | `paragraphFromLibrary` doesn't ask for the item's `id`                                                                                 |
| The item's page is a 404                                                                  | The page isn't at `blokkli/library-item/[id]`, or the user may not view the item                                                       |
| The item's label is in the source language on a translated page                           | Each translation starts with the source label                                                                                          |
| Placing a library item fails: "Paragraph type '…' is not allowed in field '…'"            | The field must allow `from_library` and the paragraph type of the item. The same goes for "Add to library" and for detaching an item   |
| Placing a library item fails: "Access denied: cannot view the library item."              | The item is unpublished, and the user lacks `administer paragraphs library`                                                            |
| "Add to library" fails: "Access denied: cannot create library items."                     | The user lacks `create paragraph library item`                                                                                         |
| "Detach from library" fails: "Access denied: cannot create paragraph of type '…'"         | The user lacks `create paragraph content <type>` for the type of the item's paragraph                                                  |
| Saving the host's form fails: "The Reusable paragraph field cannot contain a … paragraph" | The field holds a library item whose paragraph type it doesn't allow any more: blökkli refuses new ones, but keeps what is there       |
