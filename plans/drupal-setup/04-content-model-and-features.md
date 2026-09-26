# 04: Content model and features

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 03

## Goal

A content model that exercises every blökkli feature. Bundle names mirror the
mock playground (`playground/app/components/Blokkli/`), so the two playgrounds
stay comparable and E2E specs could be ported later.

## Tasks

- [ ] **Hosts:**
  - [ ] a `page` node with at least two paragraph fields (e.g. header and
        content)
  - [ ] a second node bundle
  - [ ] `blokkli_paragraph_template`
  - [ ] `paragraphs_library_item`
  - [ ] translatable config pages (winterthur uses `footer` and `global`)
- [ ] **Paragraph types**, matching the mock playground's bundles and options:
      title, text, button, button_list (nested), card, card_plain, grid
      (nested), two_columns (nested, two fields), image, gallery (nested), video
      (remote video), link, teaser (node reference), table, chart, iframe,
      blokkli_fragment, from_library, on_this_page, slider, icon, widget.
- [ ] **Editable field types:** `plain`, `markup`, `table`, `frame`.
- [ ] **Media and dropping:**
  - [ ] media types image, document and remote video, plus the media library
  - [ ] `pb_entity_mapping` for drag and drop (image, file, remote video, and
        node → teaser)
  - [ ] clipboard text (`clipboard_text_paragraph`) and pasting images
- [ ] **Fragments:** at least two `defineBlokkliFragment` components.
- [ ] **Templates:** template entity config plus its edit route (chunk 06).
- [ ] **Library:** `paragraphs_library` plus `from_library`.
- [ ] **Translation:**
  - [ ] DeepL via `paragraphs_blokkli_deepl` (the key from the environment is
        wired in chunk 03)
  - [ ] outdated-translation tracking
- [ ] **Publishing:**
  - [ ] scheduler on nodes (`publish_on` / `unpublish_on`) and block scheduling
  - [ ] revisions with log messages
  - [ ] preview grants
- [ ] **Collaboration:** comments and notifications.
- [ ] **Plugins:** port the starterkit's examples into `blokkli_playground`:
      transform `SearchAndReplace`, mutation `AddTeaserFromNodeId`, conversions
      `ButtonToText` and `SectionTitle`↔`Text`.
- [ ] **Search:** a `search_api_db` index plus `paragraphs_blokkli_search_api`
      providers for content, media and the library.
- [ ] **Roles:**
  - [ ] editor, reviewer (view and comment), translator
  - [ ] a restricted editor who is denied some bundles through
        `paragraphs_type_permissions`
- [ ] **Options:** point `paragraphs_blokkli.settings.schema_file` at the
      options schema the frontend writes (`schemaOptionsPath`), as the
      starterkit does.
- [ ] **Agent:** `paragraphs_blokkli_agent` (the `auth_secret` from the
      environment is wired in chunk 03).

## Acceptance criteria

- A feature matrix under Notes lists every blökkli feature and adapter method,
  and the bundle or config that exercises it.
- The `playground-drupal` coverage check (chunk 06) reports no feature disabled
  for lack of backend support.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Chunk 03 left a minimal model:** node type `page` with `field_paragraphs`,
  paragraph type `text` with `field_text`. Rename freely; there's no content
  until chunk 05. Every module is already enabled except `media_library` and
  `paragraphs_type_permissions` (core `media` is enabled, without types).
- **Config changes** go through `ddev drush cex` into `drupal/config/sync`.
  Reinstall with `ddev drush si --existing-config -y` to check that the export
  is complete, then `drush config:status` must be clean.
- **List allowed paragraph types explicitly** on every paragraphs field. For
  `target_bundles: null` the module reports no allowed types (F7). The library
  item's types come from each paragraph type's `allow_library_conversion`.
- **The GraphQL server's `bundles` key** must list every bundle, or
  graphql_core_schema generates no type for it (`…Unexposed`). Add new fields to
  its `fields` list too. The server also needs `media` (entity type, bundles,
  fields) once the media types exist.
- **Media-library** passes the schema check already, but fails at runtime until
  the media types and the `media_library` search provider exist.
- **Search providers** are config entities
  (`paragraphs_blokkli_search.blokkli_search_provider.*`). The template module
  needs "Entity Query Templates" enabled.
- **Block scheduling** needs scheduler's paragraph plugin: the starterkit
  patches scheduler with #3312200 (needs `cweagans/composer-patches`). Without
  it, `getEnabledTypes('paragraph')` returns nothing.
- **`paragraphs_type_permissions`:** enable it together with the roles. Every
  role then needs per-bundle view (and create/update) permissions, including
  anonymous for SSR with a preview grant.
- **`schema_file`** in `paragraphs_blokkli.settings` is still empty.
- **Translatable config pages:** the GraphQL extension is
  `translatable_config_pages` (module `graphql_translatable_config_pages`, part
  of graphql_core_schema). `enabled_types` for config pages hits the schema gap
  in F7.
- **Port `add_teaser_from_node_id`**: it's the only blökkli mutation in
  `build/drupal-schema.graphql` that the local schema lacks.
