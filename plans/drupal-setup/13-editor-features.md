# 13: Editor features

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 04, 06

## Goal

The Drupal site supports every blökkli feature, verified in the editor of
`playground-drupal`. The paragraph types added here exist for the features they
exercise; the content model's basics are in
[chunk 04](04-base-content-model.md), the demo content in
[chunk 14](14-demo-content.md).

Split off from chunk 04 on 2026-09-26. Bundle names no longer mirror the mock
playground (see the README's Decisions).

## Tasks

- [ ] **Hosts:**
  - [ ] a `page` node with at least two paragraph fields (e.g. header and
        content)
  - [ ] a second node bundle
  - [ ] `blokkli_paragraph_template`
  - [ ] `paragraphs_library_item`
  - [ ] translatable config pages (winterthur uses `footer` and `global`)
- [ ] **Paragraph types for features:**
  - [ ] nested fields: a grid, and a type with two paragraph fields (columns)
  - [ ] a node reference (teaser), with a `pb_entity_mapping` from `node`
  - [ ] whatever the blökkli modules in chunk 06 need: charts, iframes,
        table-of-contents
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
- [ ] **Checks:** once `blokkli_playground` has PHP, decide on phpcs and phpstan
      gates in `scripts/verify.sh` (deferred in chunk 07).
- [ ] **Search:** a `search_api_db` index plus `paragraphs_blokkli_search_api`
      providers for content, media and the library.
- [ ] **Roles:**
  - [ ] editor, reviewer (view and comment), translator
  - [ ] a restricted editor who is denied some bundles through
        `paragraphs_type_permissions`
  - [ ] media permissions for the editing roles
- [ ] **Options:** point `paragraphs_blokkli.settings.schema_file` at the
      options schema the frontend writes (`schemaOptionsPath`), as the
      starterkit does.
- [ ] **Agent:** `paragraphs_blokkli_agent` (the `auth_secret` from the
      environment is wired in chunk 03). Example skills, tools and prompts under
      `playground-drupal/blokkli/` (see winterthur's `frontend/blokkli/`).
- [ ] **From chunk 06** (the app has no consumer for these yet):
  - [ ] `globalOptions`, `colorOptions` and `chunkNames` in
        `playground-drupal/nuxt.config.ts`; `schemaOptionsPath` with the Options
        task above.
  - [ ] the chart data source methods in `app/blokkli.editAdapter.ts`
        (`getChartDataSources`, `getChartDataSourceCapabilities`,
        `getChartDataSourceData`), with a chart block

## Acceptance criteria

- A feature matrix under Notes lists every blökkli feature and adapter method,
  and the bundle or config that exercises it.
- The `playground-drupal` coverage check (chunk 06) reports no feature disabled
  for lack of backend support.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Config changes** go through `ddev drush cex` into `drupal/config/sync`.
  Reinstall with `ddev drush si --existing-config -y` to check that the export
  is complete, then `drush config:status` must be clean.
- **List allowed paragraph types explicitly** on every paragraphs field. For
  `target_bundles: null` the module reports no allowed types (F7). The library
  item's types come from each paragraph type's `allow_library_conversion`.
- **The GraphQL server's `bundles` key** must list every bundle, or
  graphql_core_schema generates no type for it (`…Unexposed`). Add new fields to
  its `fields` list too.
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
- **Port `add_teaser_from_node_id`**: it was the only blökkli mutation in the
  starterkit's schema that the local one lacked. Since chunk 07,
  `build/drupal-schema.graphql` is the local dump.

From [chunk 04](04-base-content-model.md) (2026-09-26):

- **The media library, pasting and dropping media already work** for the media
  types image, remote video and document. A content search provider and the node
  mapping are still missing.
- **A block type with a required field can only be added through the Drupal
  form.** `add` validates the new paragraph but can't take values (F7). Keep
  that in mind for the `addBehaviour` of new block types.
- **Link fields:** keep the link title off and put the text in its own field
  (F9).

From [chunk 06](06-playground-drupal-app.md) (2026-09-26):

- **New block types** need a component in
  `playground-drupal/app/components/Paragraph/<Pascal>/` (`index.vue` and
  `fragment.graphql` with `paragraph<Pascal>`), a spread in
  `Paragraph/fragment.paragraph.graphql`, and, if library items may hold them,
  one in `Paragraph/FromLibrary/fragment.graphql`. Then `bun run drupal:schema`.
- **Fragment components** go in `Paragraph/BlokkliFragment/<Name>/index.vue`,
  and `BlokkliField` needs `allowed-fragments` for them.
