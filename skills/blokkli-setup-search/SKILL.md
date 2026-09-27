---
name: blokkli-setup-search
description: >-
  Set up the editor's content search in a blökkli 2.x + Drupal project: the
  paragraphs_blokkli_search module, the entity mappings that turn a result into
  a paragraph, one search provider per tab, the choice of search plugin, and
  translated tab titles. Use when editors should find existing content (pages,
  news, events, contacts) in the editor and drop it onto a page as a teaser or
  contact paragraph, or when the search has no content tab, a tab stays empty, a
  content type never shows up, or a result can't be dropped.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  plus access to the Drupal backend (drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/features/search
---

# The content search

The editor's search (the magnifier in the toolbar, or Ctrl/Cmd + F) finds the
paragraphs on the page and, in one tab per search provider, existing content.
Editors drag a result onto the page, and blökkli adds a paragraph that
references it: an office becomes a contact paragraph, a page a teaser.

Three pieces make that work:

- a **search provider** per tab: which entities it searches, and how
- an **entity mapping** per bundle: which paragraph type, and which of its
  fields, a result of that bundle becomes
- the **paragraph types** the mappings name, allowed in the fields editors drop
  into (the `blokkli-add-paragraph-type` skill)

The docs: [search](https://docs.blokk.li/features/search),
[entity mappings](https://docs.blokk.li/modules/drupal/configuration#entity-mappings).
This skill is the procedure and the traps.

## 1. The module and GraphQL

- Enable `paragraphs_blokkli_search`.
- On the GraphQL server (`/admin/config/graphql`, schema "Core Composable"),
  enable the extension `paragraphs_blokkli_search`.
- Update the schema in Nuxt. The Drupal module checks for the type
  `ParagraphsBlokkliSearchTab`. Without it, it disables the `search` feature and
  names it in its "Features disabled because the Drupal GraphQL schema lacks
  support for them" log line.

Nuxt needs nothing else: the Drupal adapter implements the search's adapter
methods once the schema has them.

## 2. The entity mappings

At `/admin/config/content/blokkli/entity-mapping`, add one mapping per bundle
that the search may find:

| Found               | Becomes                                   |
| ------------------- | ----------------------------------------- |
| `node:page`         | `teaser`, its node reference `field_node` |
| `node:news`         | `teaser`, `field_node`                    |
| `node:office`       | `contact`, its reference `field_office`   |
| `taxonomy_term:...` | e.g. a contact person paragraph           |

- The paragraph field must reference that entity type.
- A bundle may map to several paragraph types. The result can then become any of
  them that the target field allows.
- **A bundle without a mapping is left out silently.** The provider form
  disables its checkbox ("This bundle is disabled because no entity mapping
  exists"), and the search skips it even if the provider's config lists it.

Export: `paragraphs_blokkli.pb_entity_mapping.<entity_type>__<bundle>.yml`.

## 3. The provider

At `/admin/config/content/blokkli/search/add`:

- **Label:** the tab's title in the editor.
- **Search type:** "Content".
- **Plugin:** see the table below. For "Entity Query": the entity type, its
  bundles, and the text fields.

Each provider is one tab and searches one entity type: add a second provider for
e.g. contact persons as taxonomy terms.

The export, `paragraphs_blokkli_search.blokkli_search_provider.<id>.yml`:

```yaml
id: content
label: Content
search_plugin_id: entity_query
search_type: content
search_plugin_configuration:
  entity_type: node
  bundles:
    - page
    - news
    - event
    - office
  # The text below a result's title: the first checked field with a value.
  text_fields:
    field_teaser: field_teaser
```

### Which plugin

| Plugin                        | How it searches                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity Query (`entity_query`) | No backend. Matches the label with `LIKE '%text%'`, in any translation, up to 50 results. Text fields are only shown, not searched.                       |
| Search API (`search_api`)     | A Search API index (`paragraphs_blokkli_search_api`): several entity types, the index's fields and ranking. Needs a backend that runs Search API queries. |

- **Entity Query** is what most projects use. Editors must type part of the
  title; typos and words from the text find nothing.
- **Search API** with the Database, Solr or Elasticsearch backend. Its
  processors "Blokkli: Search Context" and "Blokkli: Search Thumbnail" provide
  the context line and the image, and the provider maps the index's fields to
  the result.
- **Not with Typesense:** `search_api_typesense` doesn't run Search API queries.
  Its backend's `search()` only counts documents, because it expects the
  frontend to query Typesense itself. The provider then finds nothing, without
  an error. Searching Typesense from the editor needs a search plugin of its own
  that calls the module's client.

## 4. Translation

- **The tab title** is the provider's label: translate it like other config,
  with `config_translation`, or as a language override
  (`language/<langcode>/paragraphs_blokkli_search.blokkli_search_provider.<id>.yml`
  with `label`).
- **Results with Entity Query** match a title in any translation, but show the
  entity's source-language title, whatever the editor's language.

## 5. Permissions

The search has no permission of its own. It needs blökkli's edit or review
permission for edit states, like every editor query, and each result is
access-checked: editors only find what they may view.

## 6. Check it

As a user with blökkli's edit permission, query the GraphQL endpoint:

```graphql
{
  paragraphsBlokkliSearchTabs {
    id
    label
    types {
      entityType
      bundles
    }
  }
  paragraphsBlokkliSearch(id: "content", text: "hall") {
    title
    entityBundle
    targetBundles
  }
}
```

- `types` lists the bundles the tab searches: a missing bundle has no mapping.
- `targetBundles` are the paragraph types from the mappings.

Then, in the editor: open the search, pick the tab, search, and drag a result
into a field that allows its paragraph type. It shows as that paragraph.

## Traps, by symptom

- **No content tab in the search:** no provider with the search type "Content",
  or the `search` feature is disabled (section 1).
- **A content type never shows up:** it has no entity mapping (section 2).
- **A result can't be dropped anywhere:** no field on the page allows the mapped
  paragraph type.
- **Nothing is found although the content exists:** Entity Query only searches
  the title. With Search API, the index is empty (not indexed yet), or the
  backend is Typesense (section 3).
- **No text below the results:** with Entity Query, only `text`, `text_long`,
  `text_with_summary` and `string` fields are shown. A `string_long` field, e.g.
  a plain lead, is skipped.
- **English titles in the German editor:** Entity Query shows the source
  language (section 4).
