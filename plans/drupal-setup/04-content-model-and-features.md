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
  - [ ] DeepL via `paragraphs_blokkli_deepl`, with the key from the environment
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
- [ ] **Agent:** `paragraphs_blokkli_agent` with `auth_secret` from the
      environment.

## Acceptance criteria

- A feature matrix under Notes lists every blökkli feature and adapter method,
  and the bundle or config that exercises it.
- The `playground-drupal` coverage check (chunk 06) reports no feature disabled
  for lack of backend support.

## Notes
