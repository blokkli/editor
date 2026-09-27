# 13g: Search and plugins

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13c, 13d
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors can search offices, events, news, pages, media and the library from the
editor, and drop results onto a page as teaser or contact blocks (13c's entity
mappings). The starterkit's example plugins run in a custom module, adapted to
14a's block types.

## Tasks

- [ ] **Search:** a `search_api_db` index plus `paragraphs_blokkli_search_api`
      providers for content (offices, events, news, pages), media and the
      library.
- [ ] **Plugins:** port the starterkit's examples into a custom module
      `blokkli_playground`:
  - [ ] transform `SearchAndReplace` (e.g. an office renamed across a page)
  - [ ] mutation `AddTeaserFromNodeId`, for 13c's teaser block
  - [ ] conversions text ↔ title and button → text
- [ ] **Checks:** `blokkli_playground` is the first custom PHP. Decide on phpcs
      and phpstan gates in `scripts/verify.sh` (deferred in chunk 07).
- [ ] Skills:
  - [ ] new `blokkli-setup-search`
  - [ ] new `blokkli-write-drupal-plugin`: transform, conversion and mutation
        plugins, and what the frontend needs for them

## Acceptance criteria

- The search finds offices, events, news, pages, media and library items, and a
  result can be added to the page as the matching block.
- Every example plugin works in the editor.
- The skills exist.

## Notes

From [chunk 03](03-drupal-base-site.md) and [04](04-base-content-model.md)
(2026-09-26):

- **Search providers** are config entities
  (`paragraphs_blokkli_search.blokkli_search_provider.*`). The media library
  provider exists since chunk 04; a content provider is still missing.
- **Port `add_teaser_from_node_id`**: it was the only blökkli mutation in the
  starterkit's schema that the local one lacked. Since chunk 07,
  `build/drupal-schema.graphql` is the local dump.

From [13c](13c-hosts.md) (2026-09-26):

- **The node mappings exist** (page, news, event → teaser; office → contact),
  but no content search provider yet: that's the task here.
- **`entity_query`'s text fields,** to verify: `EntityQuery::getEntityText()`
  seems to iterate the setting's values (unchecked boxes are stored as `0`), and
  `string_long` (the lead) isn't among its field types. Record it in findings.md
  if it holds.
- **The custom module `blokkli_playground` exists** (13c: a route subscriber for
  config pages). Add the plugins there.
