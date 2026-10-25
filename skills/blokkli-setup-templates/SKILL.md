---
name: blokkli-setup-templates
description: >-
  Set up templates in a blökkli 2.x + Drupal project: the
  paragraphs_blokkli_template module, its GraphQL exposure, the template search
  provider, permissions, default templates for new paragraphs, and the Nuxt page
  that edits templates. Use when editors should insert prepared sets of
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
  version: '1.1.5'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/pages#library-item-and-template-pages
---

# Templates

A template is a set of paragraphs that editors insert into a page as a copy.
Changing the template later doesn't change the pages. That's the difference to
library items, which are reused by reference (the `blokkli-setup-library`
skill).

Templates are content entities (`blokkli_paragraph_template`) with their own
paragraphs. Editors create them from selected paragraphs ("Create template"),
insert them ("Template" in the add menu), and edit them on a page of their own.
A template marked as default fills every new paragraph of its type.

The docs:
[the library item and template pages](https://docs.blokk.li/modules/drupal/pages#library-item-and-template-pages).
This skill is the procedure and the traps.

## 1. The module

Enable `paragraphs_blokkli_template`. It also enables
`paragraphs_blokkli_search` and `content_translation`, even on a site with one
language.

Templates can hold every paragraph type, including `from_library` paragraphs.
Fragments can't be added to them.

**Translation:** on a multilingual site, enable content translation for
templates (`/admin/config/regional/content-language`). Then a template's label
and paragraphs are translated in the editor as a page's are, and a template
added to a page gives the page's translations the template's.

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

The dialog lists the templates whose paragraphs the field allows, to users who
may view templates. Inserting one is refused if:

- the target field doesn't allow one of its paragraph types: "Paragraph type '…'
  is not allowed in field '…'."
- the user may not insert it (section 4): "Access denied: …"

## 4. Permissions

Tell the developer who needs which permissions; don't assign them:

| Task                                                  | Permission                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Find a template in the dialog, and insert it          | `view paragraph templates`                                       |
| Create one ("Create template")                        | `create paragraph template`                                      |
| Edit one on its page                                  | `view paragraph templates` and `edit own/any paragraph template` |
| Delete one                                            | `delete own/any paragraph template`                              |
| Make one the default, or change a default             | `manage default paragraph templates` (restricted: admins)        |
| The list at `/admin/config/content/blokkli/templates` | `view paragraph templates` or `administer paragraph templates`   |

Editors also need blökkli's edit state permissions, as for any host.

With per-type permissions (`paragraphs_type_permissions`), inserting a template
also needs `create paragraph content <type>` for every paragraph type in it, the
nested ones included. A template is no way around them.

## 5. The page in Nuxt

A template's canonical URL is its page: `/blokkli/template/{id}`, behind the
language prefix if the site has one. "Edit" in the editor's "Templates" menu
opens it in a nested editor, and Drupal links there too (e.g. in the list of
edit states when publishing). In Drupal, the template's form is its edit form
(`/admin/config/content/blokkli/templates/{id}/edit`).

Create the page, `pages/blokkli/template/[id].vue` (with the site's language
prefix in front, if the routes have one):

```vue
<template>
  <BlokkliDrupalEditTemplate :id />
</template>

<script lang="ts" setup>
import BlokkliDrupalEditTemplate from '#blokkli/drupal/components/BlokkliDrupalEditTemplate/index.vue'

const id = String(useRoute().params.id)
</script>
```

- **Import the component explicitly.** It isn't registered as a Nuxt component.
- **The component** loads the template by its id and renders its paragraphs. It
  answers 404 when the template doesn't exist or the user may not view it or use
  blökkli.
- **Layout:** none is needed. Use `layout: false` or the project's own layout.
- The web server or proxy must send the path, with the language prefix, to Nuxt.

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
    Drupal's form, and when it's added by the agent. In a field that the agent
    fills with children of its own, the template adds none.
  - Paragraphs created by pasting, dropping (media, search results), from the
    library or from another template don't get it.
- **Options:** the new paragraph gets the options of the template's paragraph.
  Options that the agent sets take precedence.
- **Permissions:** the template's nested paragraphs come with the new paragraph,
  even if the user may not create their types (Paragraphs Type Permissions).
  Changing them takes the permission to update them.
- **Templates are content, not config.** Deploying config doesn't create them:
  create them in each environment, or in the seed content.

## 7. Check the result

1. **The schema** has `BlokkliParagraphTemplate` with the fields in section 2.
2. **The Nuxt dev server's log** doesn't list templates among the disabled
   features (recent versions say "The Drupal GraphQL schema supports all
   features").
3. **In the browser, as an editor** (not user 1):
   - select paragraphs, "Create template"
   - "Template" in the add menu lists it with a preview, and inserts it
   - "Templates" in the menu, then "Edit", opens the template's page; publish
     there
   - Drupal's link to a template's edit state (the list of edit states when
     publishing) opens the same page in the editor
   - for a default: add a paragraph of its type, and it has the template's
     children

## Symptoms and causes

| Symptom                                                                          | Cause                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The "Template" dialog is empty                                                   | No search provider of type "Paragraph Templates", the user lacks `view paragraph templates`, the field allows none of the templates' paragraph types, or each template holds a paragraph type, also a nested one, that the user may not create |
| Inserting a template fails: "Access denied: cannot view the template."           | The user lacks `view paragraph templates`                                                                                                                                                                                                      |
| Inserting a template fails: "Access denied: cannot create paragraph of type '…'" | The user lacks `create paragraph content <type>` for a type in the template, also a nested one                                                                                                                                                 |
| No "Template" or "Create template" in the editor                                 | Templates are disabled: see the Nuxt log (a missing field on `BlokkliParagraphTemplate`)                                                                                                                                                       |
| Templates have no edit button                                                    | The user may not edit the template (`edit own/any paragraph template`)                                                                                                                                                                         |
| The template's page is a 404                                                     | The page isn't at `blokkli/template/[id]`, the user lacks `view paragraph templates`, or the id doesn't exist                                                                                                                                  |
| `[nuxt] Invalid layout … selected`                                               | The page sets a layout the project doesn't have                                                                                                                                                                                                |
| "Use as default" is disabled                                                     | Not exactly one paragraph is selected, or the user lacks `manage default paragraph templates`                                                                                                                                                  |
| New paragraphs don't get the default template                                    | They were pasted, dropped or taken from the library; or the default holds more than one paragraph                                                                                                                                              |
| Inserting a template fails: "Paragraph type '…' is not allowed in field '…'"     | The template holds a paragraph type that the target field, or the field of its parent, doesn't allow                                                                                                                                           |
| Adding a paragraph type fails with the same message, naming a field of the type  | The type's default template holds a nested paragraph type that the field doesn't allow                                                                                                                                                         |
