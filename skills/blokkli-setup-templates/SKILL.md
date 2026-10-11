---
name: blokkli-setup-templates
description: >-
  Set up templates in a blökkli 2.x + Drupal project: the
  paragraphs_blokkli_template module, its GraphQL exposure, the template search
  provider, permissions, default templates for new paragraphs, and the Nuxt
  route that edits templates. Use when editors should insert prepared sets of
  paragraphs (e.g. a service page), when new paragraphs of a type should start
  with content (e.g. columns with two texts), or when the "Template" dialog is
  empty, templates can't be edited, or a default template isn't applied.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.1.1'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/pages#template-editing
---

# Templates

A template is a set of paragraphs that editors insert into a page as a copy.
Changing the template later doesn't change the pages. That's the difference to
library items, which are reused by reference (the `blokkli-setup-library`
skill).

Templates are content entities (`blokkli_paragraph_template`) with their own
paragraphs. Editors create them from selected paragraphs ("Create template"),
insert them ("Template" in the add menu), and edit them on a route of their own.
A template marked as default fills every new paragraph of its type.

The docs:
[template editing](https://docs.blokk.li/modules/drupal/pages#template-editing),
[`templateEditRouteName`](https://docs.blokk.li/modules/drupal/configuration#templateeditroutename).
This skill is the procedure and the traps.

## 1. The module

Enable `paragraphs_blokkli_template`. It also enables
`paragraphs_blokkli_search` and `content_translation`, even on a site with one
language.

Templates can hold every paragraph type, including `from_library` paragraphs.
Fragments can't be added to them.

## 2. GraphQL

On the GraphQL server (`/admin/config/graphql`, schema "Core Composable"):

- **Extensions:** `paragraphs_blokkli_template`, which needs blökkli's edit
  extension.
- **`enabled_entity_types`:** `blokkli_paragraph_template`. It has no bundles,
  so it needs no `bundles` entry.
- **`fields`:** `description`, `is_default` and `paragraphs` of
  `blokkli_paragraph_template`.
- **`entity_base_fields`:** `uuid` and `label`, which blökkli's setup usually
  has already.

Then update the schema in Nuxt. The Drupal module checks the type
`BlokkliParagraphTemplate` with `uuid`, `label`, `description`, `isDefault` and
`paragraphs`. If one is missing, it disables templates and logs "Missing GraphQL
fields on type …".

## 3. The search provider

The "Template" dialog lists templates through a search provider. **Without one,
the dialog is empty, and nothing reports an error.**

At `/admin/config/content/blokkli/search/add` add a provider:

- search type "Paragraph Templates"
- plugin "Entity Query Templates"

Export the config (`drush cex`). The export is
`paragraphs_blokkli_search.blokkli_search_provider.<id>.yml`.

The dialog lists every template, including ones whose paragraph types the target
field doesn't allow. Inserting such a template is refused: "Paragraph type '…'
is not allowed in field '…'."

## 4. Permissions

Tell the developer who needs which permissions; don't assign them:

| Task                                                  | Permission                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Insert a template, with previews in the dialog        | `view paragraph templates` (without it, the previews stay empty) |
| Create one ("Create template")                        | `create paragraph template`                                      |
| Edit one on its route                                 | `view paragraph templates` and `edit own/any paragraph template` |
| Delete one                                            | `delete own/any paragraph template`                              |
| Make one the default, or change a default             | `manage default paragraph templates` (restricted: admins)        |
| The list at `/admin/config/content/blokkli/templates` | `view paragraph templates` or `administer paragraph templates`   |

Editors also need blökkli's edit state permissions, as for any host.

## 5. The route in Nuxt

Templates are edited on a page of their own. Create it, e.g.
`pages/blokkli/template/[uuid].vue`:

```vue
<template>
  <BlokkliDrupalEditTemplate :uuid />
</template>

<script lang="ts" setup>
import BlokkliDrupalEditTemplate from '#blokkli/drupal/components/BlokkliDrupalEditTemplate/index.vue'

definePageMeta({
  name: 'blokkli-template',
})

const uuid = String(useRoute().params.uuid)
</script>
```

- **Import the component explicitly.** It isn't registered as a Nuxt component.
- **The route may have no parameter besides `uuid`.** blökkli resolves it by
  name with the uuid only. A `[lang]` segment, or route names that an i18n
  module suffixes with the language, make it fail. The console then says "The
  provided templateEditRouteName … is not valid", and templates have no edit
  button.
- **Language:** without a language prefix, the GraphQL request uses the default
  language, and templates are edited in it. Their paragraphs are copied into
  pages, which translate them.
- **Layout:** none is needed. Use `layout: false` or the project's own layout.
- The web server or proxy must send the path to Nuxt.

Then give blökkli the route's name:

```typescript
export default defineNuxtConfig({
  blokkli: {
    modules: [drupal({ templateEditRouteName: 'blokkli-template' })],
  },
})
```

The editor's "Templates" menu lists them, and "Edit" opens this route in a
nested editor. Drupal's own links to a template (e.g. in the list of edit states
when publishing) lead to its admin form instead.

## 6. Default templates

A template marked as default fills every new paragraph of its type, e.g. new
columns with a text in each column.

- **Creating one:** set up one paragraph with its children, select it, choose
  "Create template", and check "Use as default". The checkbox needs
  `manage default paragraph templates`.
- **Exactly one paragraph,** and one default per paragraph type. A second
  default for the same type is refused.
- **When it's applied:**
  - It applies when a paragraph is added from the add menu, with or without
    Drupal's form, and when it's added by the agent. The agent's own children
    are added on top of the template's.
  - Paragraphs created by pasting, dropping (media, search results), from the
    library or from another template don't get it.
- **The paragraph's own options** aren't taken from the template, only its
  children's.
- **Templates are content, not config.** Deploying config doesn't create them:
  create them in each environment, or in the seed content.

## 7. Check the result

1. **The schema** has `BlokkliParagraphTemplate` with the fields in section 2.
2. **The Nuxt dev server's log** doesn't list templates among the disabled
   features (recent versions say "The Drupal GraphQL schema supports all
   features"). Without the route name, it warns that `templateEditRouteName` is
   missing.
3. **In the browser, as an editor** (not user 1):
   - select paragraphs, "Create template"
   - "Template" in the add menu lists it with a preview, and inserts it
   - "Templates" in the menu, then "Edit", opens the route; publish there
   - for a default: add a paragraph of its type, and it has the template's
     children

## Symptoms and causes

| Symptom                                                                              | Cause                                                                                                |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| The "Template" dialog is empty                                                       | No search provider of type "Paragraph Templates"                                                     |
| The dialog lists templates, but their previews are empty                             | The user lacks `view paragraph templates`                                                            |
| No "Template" or "Create template" in the editor                                     | Templates are disabled: see the Nuxt log (a missing field on `BlokkliParagraphTemplate`)             |
| Templates have no edit button; "templateEditRouteName … is not valid" in the console | The route name is wrong, or the route has a parameter besides `uuid`                                 |
| The template's route renders nothing                                                 | The user lacks `view paragraph templates`, or the uuid doesn't exist                                 |
| `[nuxt] Invalid layout … selected`                                                   | The page sets a layout the project doesn't have                                                      |
| "Use as default" is disabled                                                         | Not exactly one paragraph is selected, or the user lacks `manage default paragraph templates`        |
| New paragraphs don't get the default template                                        | They were pasted, dropped or taken from the library; or the default holds more than one paragraph    |
| New paragraphs from the agent have their children twice                              | The agent adds its own children on top of the default template's                                     |
| Inserting a template fails: "Paragraph type '…' is not allowed in field '…'"         | The template holds a paragraph type that the target field, or the field of its parent, doesn't allow |
| Adding a paragraph type fails with the same message, naming a field of the type      | The type's default template holds a nested paragraph type that the field doesn't allow               |
