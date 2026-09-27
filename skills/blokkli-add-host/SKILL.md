---
name: blokkli-add-host
description: >-
  Make an entity editable with blökkli in a Drupal project: a node bundle,
  another content entity type, or a config page (translatable_config_pages),
  with one or more paragraphs fields. Covers enabled types, the GraphQL server,
  a canonical URL the frontend serves, the Nuxt component with BlokkliProvider,
  the route, several paragraphs fields (e.g. a sidebar) and hosts rendered in
  the layout (footer, site header). Use when adding a content type or config
  page that editors should edit in blökkli, when a host has no edit button, when
  a paragraphs field stays empty while editing, when host fields don't update
  while editing, or when blökkli's links lead into the Drupal admin.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module, paragraphs_blokkli 2.x,
  graphql_core_schema and nuxt-graphql-middleware, plus access to the Drupal
  backend (drush, config export, custom modules) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.3'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/pages
---

# Adding a host

A host is the entity whose paragraphs blökkli edits: usually a node, but any
content entity type with bundles works, including config pages. The order is
always the same: Drupal, then the GraphQL schema, then Nuxt. The GraphQL type
doesn't exist until the bundle is exposed and the schema is updated.

The docs: [pages with Drupal](https://docs.blokk.li/modules/drupal/pages),
[`BlokkliProvider`](https://docs.blokk.li/components/BlokkliProvider),
[`BlokkliField`](https://docs.blokk.li/components/BlokkliField).

## Before you start

- The base setup exists (the `blokkli-setup-drupal` skill).
- **The paragraphs fields:** usually one for the content. Add more for regions
  that hold other paragraphs, e.g. a sidebar with contact boxes. Each field has
  its own allowed types.
- **The host's own fields:** which ones render outside the paragraphs (title,
  lead, image, structured data such as dates or an address), and which of those
  are edited on the page (inline text, dropped media). The rest are edited in
  the entity's form, which the editor also opens.
- **Page-level options** (e.g. a header variant): the
  `blokkli-setup-host-options` skill.
- **Paragraphs that show a host** (a teaser, a contact box): the
  `blokkli-add-paragraph-type` skill.

## 1. The bundle and its fields

- **Paragraphs fields:** `entity_reference_revisions` to paragraph, unlimited
  and **untranslatable**. The translations share the list, and blökkli
  translates the paragraphs, not the list.
- **List the allowed types explicitly** on every paragraphs field. A field that
  allows "all types" is reported to the editor as allowing none.
- **The other fields:** translatable if their value differs per language (text,
  often an address), untranslatable otherwise (dates, links, references, phone
  numbers).
- **Translation:** enable it for the bundle if the site is multilingual. If the
  site shows `created` (e.g. as a news date), make it untranslatable too; the
  `blokkli-setup-translations` skill has the override.
- **The form display:** every field that editors change outside blökkli. The
  editor's "Edit" on the host opens this form.
- Export the config (`drush cex`).

## 2. Enable it for blökkli

Add the bundle to the enabled types at `/admin/config/content/blokkli`
(`paragraphs_blokkli.settings:enabled_types`, keyed by entity type). Without it
the GraphQL type has no `blokkliProps` and the page has no edit button.

For an entity type other than `node`, a config schema check reports
`enabled_types.<entity type>` as "missing schema": the module's schema only
declares `node`. It works anyway.

## 3. GraphQL

On the GraphQL server (`/admin/config/graphql`, schema "Core Composable"):

- **`bundles`:** enable the bundle. Without it, the type is `…Unexposed`.
- **`fields`:** add the host's fields for its entity type.
- **`enabled_entity_types`:** the entity type, if it's new to the server.

Then update the schema in Nuxt. The bundle's type (e.g. `NodeNews`) now has
`blokkliProps` and the fields.

**Structured fields** come out like this:

| Field type                     | GraphQL                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `daterange`                    | `FieldItemTypeDaterange`: `value` and `endValue` are UTC without an offset. Use `startDate` and `endDate` with a `format` or `drupalDateFormat` |
| `datetime`                     | `FieldItemTypeDatetime`: the same, with `formatted(format: …)`                                                                                  |
| `created`, `changed`           | `String`, ISO 8601 with an offset. Formatted: `createdRawField { first { formatted(drupalDateFormat: …) } }`                                    |
| `list_string`                  | `String`, the key: the labels aren't in the schema                                                                                              |
| `telephone`, `email`, `string` | `String`                                                                                                                                        |
| `link`                         | `FieldItemTypeLink` (`uri { path }`, `title`)                                                                                                   |
| `entity_reference`             | the target bundle's type if the field allows one bundle, otherwise the interface (e.g. `Node`) with inline fragments                            |
| other modules' types           | a generated `FieldItemType<Name>` with one field per property                                                                                   |

- Dates without an offset come out shifted by an hour or two, between the server
  and the browser too.
- **Let Drupal format dates** in the page's language: `drupalDateFormat` takes a
  date format (e.g. `LONG`, or your own: every format is in the enum), `format`
  a PHP date format such as `"H:i"`.
  - Month and day names need the `locale` module and the languages' interface
    translations (`drush locale:check && drush locale:update`). Without them
    they're English in every language.
  - Translate a format's pattern per language (e.g. `j. F Y` in German) with a
    config translation of `core.date_format.<id>`.
  - For a range, select the day and the time of start and end, and show the day
    once if both are the same.
  - Keep `format: "c"` for machines, e.g. `<time datetime>`.
- A computed property that depends on the time (e.g. "open now") is cached with
  the GraphQL response: compute it in the frontend.

## 4. A URL the frontend serves

blökkli links to the host's canonical URL, in several places:

- to start editing from lists in the editor (`?blokkliEditing=<uuid>`)
- to switch the language while editing
- for previews

Nodes are fine. For an entity type whose canonical URL is under `/admin`, move
the route to a path the frontend serves:

- config pages from `translatable_config_pages`
- anything else Drupal serves

Do it with a route subscriber in a custom module, as `paragraphs_library` does
for its library items:

```php
// src/Routing/RouteSubscriber.php, registered in <module>.services.yml with
// the tag event_subscriber.
final class RouteSubscriber extends RouteSubscriberBase {

  protected function alterRoutes(RouteCollection $collection): void {
    $route = $collection->get('entity.translatable_config_pages.canonical');
    $route?->setPath('/blokkli/config-page/{translatable_config_pages}');
  }

}
```

- The route is no longer an admin route. The entity's other routes (edit,
  translations) stay where they are.
- The frontend's route query then resolves the path (with the language prefix)
  to the entity, like a node. Render it there (section 7).
- The web server or proxy must send the path to Nuxt, not to Drupal.

## 5. Permissions

Tell the developer who needs which permissions; don't assign them:

- update access to the host, e.g. `edit any news content`, or
  `manage translatable config pages` and `translate translatable_config_pages`
  for config pages
- blökkli's edit state permissions, as for other hosts
- `transfer blokkli paragraphs` to copy paragraphs between hosts

## 6. The component

**The fragment** has `blokkliProps`, an alias per paragraphs field, and the
host's own fields:

```graphql
fragment nodeNews on NodeNews {
  uuid
  title
  lead: fieldLead
  image: fieldImage {
    ...mediaImage
  }
  created
  blokkliProps {
    ...blokkliProps
  }
  paragraphs: fieldParagraphs {
    ...paragraphsFieldItem
    props {
      ...paragraph
    }
  }
}
```

**`pbMutatedEntity`** (the app's fragment of host fields that change while
editing) gets the fields that are **edited on the page**, with the same aliases:

```graphql
fragment pbMutatedEntity on Entity {
  # …
  ... on NodeNews {
    title
    lead: fieldLead
    image: fieldImage {
      ...mediaImage
    }
  }
}
```

- It comes with every mutation: keep it slim.
- Fields edited in the entity's form don't need it. Saving the form reloads the
  page's data.

**The component** renders `BlokkliProvider` and a `BlokkliField` per paragraphs
field:

```vue
<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <div v-blokkli-droppable:field_image>
      <MediaImage v-if="entity.image" v-bind="entity.image" />
    </div>
    <h1 v-blokkli-editable:title>{{ entity.title }}</h1>
    <p v-if="entity.lead || isEditing" v-blokkli-editable:field_lead>
      {{ entity.lead }}
    </p>
    <BlokkliField name="field_paragraphs" :list="paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { NodeNewsFragment } from '#graphql-operations'

const props = defineProps<NodeNewsFragment>()
</script>
```

- **Render host fields from the slot's `entity`:** while editing it holds the
  changed values.
- **`v-blokkli-editable` and `v-blokkli-droppable` only for fields the bundle
  has.** A droppable element for a field the host lacks throws in the editor,
  and hovering and dragging stop working. A header component shared by several
  bundles must leave out the image area for bundles without the image field.
- **Don't nest providers.** A provider inside another's slot is not supported.

## 7. The route

The page that renders routes must render the bundle:

- add its fragment to the route query
- switch on `__typename`

```vue
<template>
  <NodePage v-if="entity?.__typename === 'NodePage'" v-bind="entity" />
  <NodeNews v-else-if="entity?.__typename === 'NodeNews'" v-bind="entity" />
</template>
```

The editor starts on this page, so a bundle without a component here can't be
edited.

## 8. Several paragraphs fields

- **One `BlokkliField` each.**
  - `name` must be the Drupal machine name. In the editor, `list` is ignored and
    the field is loaded by name.
  - A wrong name renders an empty field that takes no drops.
- **An empty field** renders nothing outside the editor, but always renders
  while editing, so that it takes drops. Give it a size while editing:
  `edit-class="min-h-24"`.
- **`non-empty-class`** is set while the field has paragraphs, in both modes,
  from the current list. Use it to switch the layout, e.g. a sidebar column only
  when the sidebar has paragraphs:

```vue
<div class="page-body">
  <BlokkliField name="field_paragraphs" :list="paragraphs" />
  <BlokkliField
    name="field_aside"
    :list="aside"
    field-list-type="sidebar"
    non-empty-class="has-aside"
  />
</div>
```

```css
.page-body:has(> .has-aside) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
}
```

- **`field-list-type`** tells paragraphs where they are. Declare the types in
  the module option `fieldListTypes`. A paragraph component then reads it from
  `defineBlokkli`:
  - `const { fieldListType } = defineBlokkli(…)`, e.g. to skip its page-width
    container in the sidebar
  - or it gets a variant for it with `renderFor: { fieldListType: 'sidebar' }`
- **Moving paragraphs between fields:** pasting (the `block-transfer` feature)
  asks which field to paste into. Import from another page lets editors choose
  the fields, and only copies from entities of the same type and bundle.

## 9. Config pages

Config pages from `translatable_config_pages` hold site-wide content such as a
footer or a site-wide notice.

- **Drupal:**
  - modules `translatable_config_pages` and `graphql_translatable_config_pages`
    (part of graphql_core_schema)
  - the server extension `translatable_config_pages`
  - `enabled_entity_types.translatable_config_pages`, the bundles and fields
  - `enabled_types` (section 2), and the canonical URL (section 4)
- **One entity per type, created by hand.** It's content, not config: deploying
  config doesn't create it. Create it in each environment, or in the seed.
- **The query** is `<camelCaseBundle>Config`, e.g. `footerConfig`:
  - It returns null until the entity exists. A null result stays in the GraphQL
    response cache until the caches are cleared.
  - It loads the entity in the current language. Without that translation it
    returns the default translation, and blökkli then edits that language.
    Create the translations.
- **In the layout:** render it with its own `BlokkliProvider`, as a sibling of
  the page's, never inside it. Each provider gets its own edit button.
  - Set `edit-path` to the config page's own URL (`url { path }`), so that
    editing happens on its route, where Drupal's links lead too.
  - The route page renders a config page on its own there.
  - `isolate` (hides the other providers while this one is edited) isn't needed
    on its own route. On a normal page it would hide the header and footer while
    the page is edited.
- **Labels:** config pages have no label, so the editor's lists show them
  without a name.
- **Import from another page** doesn't apply: there is one entity per type.
- **Components outside `Node/` or `Paragraph/`:** if one calls
  `defineBlokkliProvider`, add its folder to the module's `pattern`.

## 10. Check the result

1. **The schema** has the bundle's type with `blokkliProps` and its fields, and
   no `…Unexposed` type. For config pages, also `<bundle>Config` and
   `TRANSLATABLE_CONFIG_PAGES` in `EntityType`.
2. **The Nuxt dev server's log** says "The Drupal GraphQL schema supports all
   features" (in recent versions of the Drupal module).
3. **In the browser, as an editor** (not user 1):
   - the edit button, and every paragraphs field offers its allowed types
   - inline edits to host fields show at once
   - publish, and the changes are there after a reload
   - switch the language while editing, and stay in the frontend
   - for a config page: its edit button on a normal page leads to its own route

## Symptoms and causes

| Symptom                                                                               | Cause                                                                                                                        |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| No edit button                                                                        | Bundle not in the enabled types, missing permissions, or `blokkliProps` not bound                                            |
| `Unknown type "Node…"` or a `…Unexposed` type                                         | The bundle is missing from the server's `bundles`                                                                            |
| `blokkliProps` is missing on the type                                                 | The bundle isn't in the enabled types, or the schema wasn't updated after adding it                                          |
| A paragraphs field is empty while editing and takes no drops                          | `name` isn't the field's machine name                                                                                        |
| The editor offers no paragraph types in a field                                       | The field allows "all types"; list them                                                                                      |
| An inline edit of a host field doesn't show until a reload                            | The field is missing from `pbMutatedEntity`, or the template doesn't read it from the slot's `entity`                        |
| Hovering and dragging stop working on one bundle's pages                              | A `v-blokkli-droppable` or `v-blokkli-editable` for a field the bundle doesn't have                                          |
| Starting the editor, switching the language or previewing leads into the admin        | The entity type's canonical URL is under `/admin`: move it (section 4)                                                       |
| The config page renders nothing                                                       | The entity doesn't exist yet, or a null result is still cached: create it, then clear the caches                             |
| A config page is edited in the default language on a translated page                  | The translation doesn't exist                                                                                                |
| Dates are an hour or two off                                                          | The raw `value` of a date field has no offset; use `startDate`, `endDate` or `formatted`                                     |
| Month names are English on a translated page                                          | The `locale` module or the interface translations are missing                                                                |
| Saving the entity's form fails with "This entity (paragraph: N) cannot be referenced" | The field holds a paragraph type it doesn't allow (blökkli's mutations don't check allowed types; e.g. after narrowing them) |
