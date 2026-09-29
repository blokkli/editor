# Findings: upstream bugs

Bugs found while working on this plan that belong in other projects, mostly
`paragraphs_blokkli`. They're tracked here and fixed separately, not as part of
a chunk. Update the status when one is fixed, and name the commit or issue.

Code references are relative to the `paragraphs_blokkli` repository at `32bbcfe`
(2.0.x), unless noted otherwise.

| #   | Finding                                                                                                                 | Project              | Severity | Status     | Blocks   |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------------------- | -------- | ---------- | -------- |
| F1  | [Duplicate edit states](#f1-duplicate-edit-states)                                                                      | `paragraphs_blokkli` | high     | open       | chunk 09 |
| F2  | [Lost mutations on concurrent writes](#f2-lost-mutations-on-concurrent-writes)                                          | `paragraphs_blokkli` | high     | open       | chunk 09 |
| F3  | [Edit state in the persistent entity cache](#f3-edit-state-in-the-persistent-entity-cache)                              | `paragraphs_blokkli` | low      | open       | –        |
| F4  | [`clearOutdated` type mismatch](#f4-clearoutdated-type-mismatch)                                                        | `paragraphs_blokkli` | low      | open       | –        |
| F5  | [Twig 3.30 breaks escaping](#f5-twig-330-breaks-escaping)                                                               | Drupal core          | high     | workaround | –        |
| F6  | [Starterkit nginx routing](#f6-starterkit-nginx-routing)                                                                | `blokkli_starterkit` | low      | open       | –        |
| F7  | [Undeclared dependencies and config gaps](#f7-undeclared-dependencies-and-config-gaps)                                  | `paragraphs_blokkli` | low      | open       | –        |
| F8  | [Upload mutations ignore tokens in the file directory](#f8-upload-mutations-ignore-tokens-in-the-file-directory)        | `paragraphs_blokkli` | low      | workaround | –        |
| F9  | [Link titles from entity mappings](#f9-link-titles-from-entity-mappings)                                                | `paragraphs_blokkli` | medium   | workaround | –        |
| F10 | [Paragraphs below level 5 are lost on publish](#f10-paragraphs-below-level-5-are-lost-on-publish)                       | `paragraphs_blokkli` | medium   | workaround | –        |
| F11 | [Options schema: no validation, lossy form saves](#f11-options-schema-no-validation-lossy-form-saves)                   | `paragraphs_blokkli` | low      | open       | –        |
| F12 | ["Make reusable" on a container with unpublished children](#f12-make-reusable-on-a-container-with-unpublished-children) | `paragraphs_blokkli` | medium   | open       | –        |
| F13 | [`bkVisibleLanguages` on library blocks](#f13-bkvisiblelanguages-on-library-blocks)                                     | `@blokkli/editor`    | low      | open       | –        |
| F14 | [The comment filter leaks into new text formats](#f14-the-comment-filter-leaks-into-new-text-formats)                   | `paragraphs_blokkli` | low      | open       | –        |
| F15 | [Config pages have no label in entity lists](#f15-config-pages-have-no-label-in-entity-lists)                           | `paragraphs_blokkli` | low      | open       | –        |
| F16 | [Mutations ignore a field's allowed types](#f16-mutations-ignore-a-fields-allowed-types)                                | `paragraphs_blokkli` | medium   | open       | –        |
| F17 | [`detach_reusable` bugs](#f17-detach_reusable-bugs)                                                                     | `paragraphs_blokkli` | medium   | open       | –        |
| F18 | [Links to library items and templates](#f18-links-to-library-items-and-templates)                                       | both                 | low      | workaround | –        |
| F19 | [Template and library search](#f19-template-and-library-search)                                                         | both                 | low      | open       | –        |
| F20 | [Default templates with `add_multiple`](#f20-default-templates-with-add_multiple)                                       | `paragraphs_blokkli` | low      | open       | –        |
| F21 | ["Add to library" needs two clicks](#f21-add-to-library-needs-two-clicks)                                               | `@blokkli/editor`    | low      | open       | –        |
| F22 | [Preview grants only work for some viewers](#f22-preview-grants-only-work-for-some-viewers)                             | `paragraphs_blokkli` | medium   | open       | chunk 10 |
| F23 | [A past unpublish date blocks publishing](#f23-a-past-unpublish-date-blocks-publishing)                                 | both                 | low      | open       | –        |
| F24 | [Paragraph schedules apply to one translation](#f24-paragraph-schedules-apply-to-one-translation)                       | `paragraphs_blokkli` | medium   | open       | –        |
| F25 | [An empty change description keeps the old log](#f25-an-empty-change-description-keeps-the-old-log)                     | `paragraphs_blokkli` | low      | open       | –        |
| F26 | ["Publish if unpublished" acts on the default translation](#f26-publish-if-unpublished-acts-on-the-default-translation) | `paragraphs_blokkli` | medium   | open       | –        |
| F27 | [Machine translation fails silently](#f27-machine-translation-fails-silently)                                           | `@blokkli/editor`    | low      | open       | –        |
| F28 | [Labels that can't be translated](#f28-labels-that-cant-be-translated)                                                  | `@blokkli/editor`    | low      | workaround | –        |
| F29 | [Drops write only the source's link](#f29-drops-write-only-the-sources-link)                                            | `paragraphs_blokkli` | low      | workaround | –        |
| F30 | [No hint for shared fields in a translation](#f30-no-hint-for-shared-fields-in-a-translation)                           | `paragraphs_blokkli` | low      | open       | –        |
| F31 | [The "add translation" dialog has no language](#f31-the-add-translation-dialog-has-no-language)                         | `@blokkli/editor`    | low      | open       | –        |
| F32 | [Content search results in the source language](#f32-content-search-results-in-the-source-language)                     | `paragraphs_blokkli` | medium   | open       | –        |
| F33 | [Transform plugins don't get the language](#f33-transform-plugins-dont-get-the-language)                                | both                 | low      | workaround | –        |
| F34 | [The table of contents links to hidden nested headings](#f34-the-table-of-contents-links-to-hidden-nested-headings)     | `@blokkli/editor`    | low      | to verify  | –        |
| F35 | [A data source's colour overrides apply to one language](#f35-a-data-sources-colour-overrides-apply-to-one-language)    | `@blokkli/editor`    | low      | open       | –        |
| F36 | [The `translations` option ignores English](#f36-the-translations-option-ignores-english)                               | `@blokkli/editor`    | low      | workaround | –        |
| F37 | [The iframe height editor isn't translated](#f37-the-iframe-height-editor-isnt-translated)                              | `@blokkli/editor`    | low      | open       | –        |
| F38 | [Editors can't view paragraph types](#f38-editors-cant-view-paragraph-types)                                            | `paragraphs_blokkli` | high     | workaround | –        |
| F39 | [The editor ignores `create_comments`](#f39-the-editor-ignores-create_comments)                                         | `@blokkli/editor`    | low      | to verify  | –        |
| F40 | [A new comment without a mention notifies nobody](#f40-a-new-comment-without-a-mention-notifies-nobody)                 | `paragraphs_blokkli` | low      | open       | –        |
| F41 | [Every comment is marked as edited](#f41-every-comment-is-marked-as-edited)                                             | `paragraphs_blokkli` | low      | open       | –        |
| F42 | [Uploads skip media create access](#f42-uploads-skip-media-create-access)                                               | `paragraphs_blokkli` | medium   | open       | –        |
| F43 | [Translators can't be limited to translating](#f43-translators-cant-be-limited-to-translating)                          | both                 | low      | open       | –        |
| F44 | [No approval step](#f44-no-approval-step)                                                                               | both                 | low      | open       | –        |
| F45 | ["Replace" fails on link fields](#f45-replace-fails-on-link-fields)                                                     | `paragraphs_blokkli` | medium   | open       | –        |
| F46 | [A pasted URL can't become a link](#f46-a-pasted-url-cant-become-a-link)                                                | both                 | low      | open       | –        |

Statuses: `to verify` (read in the code, not reproduced), `open`, `workaround`,
`fixed`.

## F1: Duplicate edit states

- **Found:** 2026-09-26, [SQLite spike](01-sqlite-spike.md). Happens on SQLite
  and MariaDB.
- **Symptom:** a page ends up with two `paragraphs_blokkli_edit_state` entities.
  Mutations then fail with "Missing Entity" or land in the other state, and the
  editor shows changes appearing and disappearing. In the spike this happened in
  4 of 6 SQLite runs and 3 of 3 MariaDB runs.
- **When:** the first request that loads the edit state for a page runs at the
  same time as another one. In the editor: the frontend reads the state (SSR, a
  second tab, a second user) while the first mutation runs.
- **Cause:**
  - `ParagraphsBlokkliManager::getParagraphsEditState()`
    (`src/ParagraphsBlokkliManager.php:49`) loads the state and, if there is
    none, creates and saves one. There is no lock between the load and the save.
  - Both the read path (`LoadEditState::resolve()`,
    `modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/LoadEditState.php:84`)
    and the mutation path (`LoadEditStateForMutation::resolve()`, same folder,
    line 75) create a state when none exists.
  - The table has no unique key on (`host_entity_type`, `host_entity_uuid`).
  - `ParagraphsBlokkliEditStateStorage::loadForEntityTypeAndUuid()`
    (`src/ParagraphsBlokkliEditStateStorage.php:28`) takes the first id of an
    unsorted query, so with two states the one it returns isn't fixed.
- **How to reproduce:** take a page without an edit state. Send mutations to it
  from one client while another polls `getParagraphsEditState` for it. Then:
  `SELECT host_entity_uuid, COUNT(*) FROM paragraphs_blokkli_edit_state GROUP BY host_entity_uuid HAVING COUNT(*) > 1`.
- **Fix ideas:**
  - Acquire a lock per host entity (Drupal's `lock` service) around "load or
    create" in `getParagraphsEditState()`, and load again after acquiring it.
  - Add a unique key on (`host_entity_type`, `host_entity_uuid`). The update
    hook has to merge or delete existing duplicates first.
  - Sort by id in `loadForEntityTypeAndUuid()`, so existing duplicates resolve
    the same way every time.
  - Consider not creating a state on read at all. A read could return an
    unsaved, empty state.

## F2: Lost mutations on concurrent writes

- **Found:** 2026-09-26, [SQLite spike](01-sqlite-spike.md). Happens on SQLite
  and MariaDB, and more often on MariaDB.
- **Symptom:** two users edit the same page at the same time. Both get success
  responses, but some mutations are never stored. In the spike on MariaDB, 79
  mutations from two clients reported success and 53 were stored.
- **Why it matters:** the edit state is shared by everyone editing a page. Two
  editors on one page is a normal situation, and "Invite a colleague" (chunk 09)
  creates it on purpose.
- **Cause:** a classic read-modify-write race with no lock or transaction.
  - The state is loaded in `LoadEditStateForMutation::resolve()` (the resolver
    of `paragraphsEditMutationState`).
  - The mutation is appended with `ParagraphsBlokkliEditState::addMutation()`
    (`src/Entity/ParagraphsBlokkliEditState.php:614`) and saved in
    `ParagraphsBlokkliMutation::resolve()`
    (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/ParagraphsBlokkliMutation.php:87`).
  - The other operations that write the state have the same pattern: undo, redo,
    `setHistoryIndex`, `revertAllChanges`, `takeOwnership`, publish, and so on.
  - Whichever request saves last overwrites the other's `mutations` list.
- **How to reproduce:**
  - Deterministic, as a kernel test: load the same edit state twice as separate
    objects. Add a mutation to the first and save it, then add one to the second
    and save it. The first mutation is gone.
  - Under load: two clients sending mutations to the same page.
- **Fix ideas:**
  - For every operation that writes the edit state: acquire a lock per host
    entity, reload the state (`loadUnchanged()`), apply the operation, save, and
    release the lock. Drupal's `lock` service works on every database. A
    mutation takes well under 100 ms, so waiting for the lock is cheap.
  - With the reload, the second user's mutation is applied on top of the first
    one's, and their editor gets the merged state back in the response. A
    mutation that refers to a paragraph the other user removed fails with a
    normal error.

## F3: Edit state in the persistent entity cache

- **Found:** 2026-09-26, [SQLite spike](01-sqlite-spike.md). Only happens on
  SQLite in practice.
- **Symptom:** on SQLite, a page that is read while being edited loses stored
  mutations. That was 1, 14 and 1 of 50 in three runs.
- **Cause:** core's persistent entity cache. A read writes the old edit state to
  `cache_entity` after the writer's commit, and the stale entry stays valid. The
  full explanation is in chunk 01, under "Lost updates through the persistent
  entity cache".
- **Workaround in this plan:**
  `$settings['cache']['bins']['entity'] = 'cache.backend.memory'`. It covers all
  entities, not just the edit state, so the sandbox keeps it either way.
- **Fix idea:** set `persistent_cache: FALSE` in the `#[ContentEntityType]`
  attribute of `ParagraphsBlokkliEditState`
  (`src/Entity/ParagraphsBlokkliEditState.php:40`). The state changes with every
  mutation and is loaded about once per request, so the cache gains little. This
  makes the module safe on SQLite sites that don't change the cache bin.

## F4: `clearOutdated` type mismatch

- **Found:** 2026-09-26, [SQLite spike](01-sqlite-spike.md).
- **Symptom:** calling `bulk_translate_field_values` without `clearOutdated`
  fails with "Argument #3 ($clearOutdated) must be of type bool, null given".
- **Cause:** the argument is an optional `Boolean` in the GraphQL schema, but
  `BulkTranslateFieldValues::execute()`
  (`src/Plugin/ParagraphsBlokkli/Mutation/BulkTranslateFieldValues.php:47`)
  takes a non-nullable `bool`.
- **Impact:** none for the editor, since the adapter always sends a boolean. It
  affects other API clients.
- **Fix idea:** accept `?bool` and treat `NULL` as `FALSE`.

## F5: Twig 3.30 breaks escaping

- **Found:** 2026-09-26, [SQLite spike](01-sqlite-spike.md), with Drupal 11.4.7.
- **Symptom:** every template that escapes output throws
  "EscaperRuntime::escape(): Argument #4 ($autoescape) must be of type bool,
  null given". Pages return 500.
- **Cause:** core requires `twig/twig: ^3.28.0`, and `core-recommended` 11.4.7
  doesn't pin Twig, so a fresh install gets 3.30.0. Twig 3.30 compiles `|escape`
  to `$this->escaper->escape(...)`, but with the argument list of Drupal's own
  escape filter.
- **Workaround in this plan:** pin `twig/twig` to `~3.29.0` (chunk 03).
- **To do:** check whether core has an issue for it, and remove the pin once a
  core release fixes it.

## F6: Starterkit nginx routing

- **Found:** 2026-09-26, while porting the starterkit's nginx config for
  [chunk 02](02-ddev-and-repo-layout.md). Code references are relative to the
  `blokkli_starterkit` repository (2.0.x, `.ddev/nginx_full/`, generated from
  `scripts/nginx-conf-generator/`).
- **Symptoms and causes:**
  - **Frontend paths go to Drupal.** The Drupal path prefixes are not anchored
    at a path segment, so `/blockchain` matches `block`, `/users` matches
    `user`, and `/media-kit` matches `media`. Nuxt pages with such paths are
    unreachable.
  - **The agent WebSocket loses the forwarded headers.** The
    `/api/blokkli/agent` location sets its own `proxy_set_header` lines. nginx
    then ignores all server-level ones, so Nuxt gets `Host: localhost:3000` and
    no `X-Forwarded-*` on that route.
  - **SSR requests to Drupal carry `Host: localhost`.** Nuxt calls
    `http://localhost/{lang}/graphql`, and nginx passes `Host $host` on. Drupal
    only sees the real host through `X-Forwarded-Host`. That works for URL
    generation, but anything that reads `HTTP_HOST` early (multisite or per-host
    settings) picks the wrong site.
- **Fix ideas:**
  - Anchor the prefixes: `^(/(de|fr|en))?/(prefixes)(/|$)`. Entries that end in
    `/` today (`user/`, `system/`, `devel/`, `comment/`) lose the slash. Check
    that routes such as `/entity_reference_autocomplete` are still covered,
    since `entity` no longer matches them.
  - Set every `proxy_set_header` at server level and none in locations. The
    `$http_upgrade` map already covers WebSocket upgrades.
  - Send one host to the upstreams: `X-Forwarded-Host` if present, otherwise
    `Host`, as both `Host` and `X-Forwarded-Host`. This repo's
    `.ddev/nginx_full/nginx-site.conf` does all three.

## F7: Undeclared dependencies and config gaps

- **Found:** 2026-09-26, while building the base site in
  [chunk 03](03-drupal-base-site.md).
- **Undeclared dependencies:**
  - `paragraphs_blokkli_scheduler` uses contrib `scheduler` (`scheduler.manager`
    in `BundleSupportsScheduleProcess.php`, `ParagraphScheduleDateValue.php` and
    `Mutation/SetParagraphSchedule.php`), but its `.info.yml` doesn't declare
    it.
  - `paragraphs_blokkli_search_api` extends `search_api` classes without
    declaring `search_api`.
  - The main module's settings form (`src/Form/SettingsForm.php:417`) loads the
    `media_type` storage unconditionally, so `/admin/config/content/blokkli`
    returns 500 without core `media`.
- **"All types allowed" reads as "none allowed".** For a paragraphs field with
  `target_bundles: null`, `ParagraphsBlokkliFieldConfig`
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/ParagraphsBlokkliFieldConfig.php:84`)
  returns `allowedBundles: []`, and the editor then offers no block types. Fix:
  treat `null` as every paragraph type.
- **Config schema gaps** (`config/schema/paragraphs_blokkli.schema.yml`):
  - `media_bundle_file` is read and saved, but missing from the schema.
  - `enabled_types` only declares `node`, while the settings form saves any
    entity type (e.g. `translatable_config_pages`). Both are "missing schema"
    errors in a config schema check.
- **The DeepL settings form stores the API key in config.** `api_key` is
  required, and the language mapping only renders once a key is present. Sites
  that inject the key from `settings.php` either export it with `drush cex` or
  can't use the form. Fix: make the field optional when an override is active,
  and show the mapping without it.
- **Small ones:**
  - DeepL's `hook_requirements` checks for `\DeepL\Translator`, while the client
    uses `\DeepL\DeepLClient`.
  - `PbEntityMapping` declares
    `admin_permission: 'administer pb_entity_mapping'`, which isn't defined
    anywhere (its routes use `administer blokkli settings`).

From [chunk 04](04-base-content-model.md) (2026-09-26):

- **More config schema gaps:** `blokkli_search_provider`
  (`modules/paragraphs_blokkli_search/config/schema/paragraphs_blokkli_search.schema.yml`)
  lacks `weight` and `search_plugin_configuration`, so every search provider
  fails a config schema check. The plugins' settings (`per_page`, `index_id`,
  `field_mapping`) have no schema either.
- **Empty `allowed_formats` means two things.**
  `ParagraphsBlokkliHelper::getUsableTextFormats()`
  (`src/ParagraphsBlokkliHelper.php:244`) treats it as "any format", but
  `AddClipboardText`
  (`src/Plugin/ParagraphsBlokkli/Mutation/AddClipboardText.php:149`) throws, so
  pasting text fails on a text field without allowed formats. Fix: fall back to
  the user's first usable format there too.
- **Blocks with a required field can only be added through the form.** `add`
  validates the new paragraph
  (`src/Plugin/ParagraphsBlokkli/AddMutationBase.php:143`), and its `values`
  context isn't exposed in GraphQL: `map` arguments are only mapped for a list
  of mutations
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/SchemaExtension/EditExtension.php:152`).
  So `addBehaviour: 'no-form'` or `'editable:…'` fails for such a block. If
  that's intended, document it with `addBehaviour`.

## F8: Upload mutations ignore tokens in the file directory

- **Found:** 2026-09-26, while building the content model in
  [chunk 04](04-base-content-model.md).
- **Symptom:** `add_image` and `add_file` store files in a directory literally
  named like the field's `file_directory` setting. Core's media recipes use
  `[date:custom:Y]-[date:custom:m]`, so pasted files would end up in
  `public://[date:custom:Y]-[date:custom:m]/`.
- **Cause:** `FileUploadMutationBase`
  (`src/Plugin/ParagraphsBlokkli/FileUploadMutationBase.php:259`) uses the
  setting as it is. Core's file fields replace tokens
  (`FileItem::getUploadLocation()`).
- **Fix:** use `FileItem::getUploadLocation()`, or replace tokens the same way.
- **Workaround:** plain directories (`media/images`, `media/documents`), as in
  the starterkit.

## F9: Link titles from entity mappings

- **Found:** 2026-09-26, while building the content model in
  [chunk 04](04-base-content-model.md), by reading the code.
- **Wrong title.** When a mapping targets a link field with a title,
  `LinkOrReferenceFieldTrait::setLinkOrEntityReferenceFieldValue()`
  (`src/Traits/LinkOrReferenceFieldTrait.php:62`) sets the title to
  `$entity->label()`: the paragraph, not the target entity.
  - For a new paragraph that's "Orphaned Button: …". Affected: `add_file`,
    `add_entity_reference`, `add_entity_reference_multiple`.
  - `replace_entity_reference` overwrites a title the user wrote.
  - Fix: use `$targetEntity->label()`, and keep an existing title.
- **Always true.** `isInternalLinkField()` (`:88`) returns
  `$linkTypeSetting === LINK_GENERIC || LinkItemInterface::LINK_INTERNAL`, which
  is always TRUE. It should compare the setting with both constants.
- **Lost title.** Editing a link's title inline while the field has no URI
  writes an item with only a title
  (`src/Plugin/ParagraphsBlokkli/UpdateFieldValueTrait.php:70`).
  `LinkItem::isEmpty()` only looks at the URI, so the title is dropped on save.
- **Workaround:** link fields without a title and the text in its own field, as
  in the starterkit and winterthur. The playground's `button` does this.

## F10: Paragraphs below level 5 are lost on publish

- **Found:** 2026-09-26, planning [chunk 13b](13b-block-types.md), by reading
  the code.
- **Symptom:** blocks nested more than 5 levels deep disappear when the page is
  published.
- **Cause:**
  - `ParagraphsBlokkliHelper::buildProxies()`
    (`src/ParagraphsBlokkliHelper.php:557`) only recurses while `$level < 4`, so
    it loads paragraphs down to level 5.
  - `ParagraphsBlokkliEditState::rebuildFields()`
    (`src/Entity/ParagraphsBlokkliEditState.php:491-520`) empties every
    paragraphs field it visits and refills it from the proxies, with no depth
    limit. A level-5 paragraph's children have no proxies, so its fields are
    saved empty.
- **Workaround in this plan:** the model goes 4 deep (13b).
- **Fix ideas:** the same limit in both places (or none), or leave fields
  untouched when their children weren't loaded. A kernel test with 6 levels.

## F11: Options schema: no validation, lossy form saves

- **Found:** 2026-09-26, planning [chunk 13b](13b-block-types.md).
- **No validation.** The docs said Drupal validates options against
  `schema_file`. It doesn't: mutations (`update_behavior_setting`,
  `bulk_update_behavior_settings`, `add_multiple`, `add_fragment`) store any
  string. The schema only builds the options in Drupal's own paragraphs widget
  (`ParagraphsBlokkliData::buildBehaviorForm()`). The docs are fixed (13b).
- **Lossy form saves.** Saving through that widget
  (`ParagraphsBlokkliData::submitBehaviorForm()`, line 430) goes through
  `filterBehaviorFormSubmitValues()`, which drops falsy values
  (`ParagraphsBehaviorBase.php:163-175`), then replaces the whole set:
  - A checkbox that defaults to true can't be unchecked, and a radio value `'0'`
    can't be saved.
  - Options missing from the schema are dropped.
  - Options the user never set get their default stored (seen in 13b's check).
- **The path** is used as it is (relative to the web root), and a missing file
  silently means no options.
- **Fix ideas:** keep falsy values that the schema knows; merge into the
  existing settings instead of replacing them; optionally validate mutations
  against the schema when one is configured; resolve relative paths against
  `DRUPAL_ROOT` and log a missing file.

## F12: "Make reusable" on a container with unpublished children

- **Found:** 2026-09-26, the Drupal review of 13b's plan, by reading the code.
  Reproduced 2026-09-27 in 13d (`tmp/drupal-reusable-mutations.sh f12`).
- **Symptom:** after "make reusable" on a container (a section) and publishing,
  the library item's container is the last published one:
  - A text edited since the last publish kept its edit in the run.
  - A removed text came back.
  - A title added since the last publish, and one moved in from the page, were
    lost; the moved one is gone from the page too.
  - A container that was never published ends up empty.
- **Cause:**
  - `MakeReusable`
    (`src/Plugin/ParagraphsBlokkli/Mutation/MakeReusable.php:79-131`) moves the
    container into a new library item and removes its proxy. The children's
    proxies stay behind, with the container as their host.
  - On publish, `rebuildFields()` only walks down from the host's fields.
    `from_library` holds the library item through a plain entity reference, so
    the container's fields are never rebuilt, and the container keeps the child
    list it had when the edit state loaded it.
  - The only test publishes first
    (`TemplateLibraryIntegrationTest.php:352-398`).
  - `make_reusable` doesn't check `allow_library_conversion` (F16), so the
    mutation reproduces this on any container.
- **How to reproduce:** publish a section with two texts. Then edit one, remove
  the other, add a title into the section, add a title to the page and move it
  into the section; `make_reusable` the section, publish, and list the library
  item's section.
- **Fix idea:** in `rebuildFields()`, when a `from_library` paragraph references
  a new library item, rebuild the item's `paragraphs` and mark them for saving.
  Only for new items: `rebuildFields` empties a field before refilling it.
- **In this plan:** containers have no library conversion (13d, the user). Once
  fixed, enable it, and add the containers to
  `Paragraph/FromLibrary/fragment.graphql` without letting them spread
  `paragraphFromLibrary` (a cycle).

## F13: `bkVisibleLanguages` on library blocks

- **Found:** 2026-09-26, the frontend review of 13b's plan.
- **Symptom:** the options of a block from the library show "Visible languages",
  but the setting has no effect.
- **Cause:** the options form uses the reusable block's definition
  (`src/runtime/editor/features/options/index.vue:84-86`), so the value is
  stored on the `from_library` paragraph. `isVisibleByOptions()`
  (`src/runtime/helpers/runtimeHelpers/index.ts:209-219`) checks whether that
  bundle opted into the option, and the built-in FromLibrary block opts into
  none (`src/runtime/components/Blocks/FromLibrary/index.vue:27-32`).
- **Fix idea:** check the reusable block's definition for `from_library` items,
  as the options form does.
- **Fragments too** (13d, by reading): `bundlesWithVisibleLanguage` only
  collects block definitions
  (`src/build/templates/definitions/defaultGlobalOptions.ts:27-37`), so the
  option has no effect on `blokkli_fragment` blocks either.

## F14: The comment filter leaks into new text formats

- **Found:** 2026-09-26, creating the `table` format in 13b.
- **Symptom:** every text format saved while `paragraphs_blokkli_comment` is
  enabled gets a disabled `blokkli_comment_html` filter with `settings: {}`, and
  a dependency on the module.
- **Cause:** `FilterPluginCollection::getConfiguration()` only drops filters
  whose configuration equals their defaults. `BlokkliCommentHtml`
  (`modules/paragraphs_blokkli_comment/src/Plugin/Filter/BlokkliCommentHtml.php:21-31`)
  declares default settings, but the instance reports none, so the comparison
  never matches.
- **Impact:** noise in config exports. Core removes the filter when the module
  is uninstalled.
- **Fix idea:** make the plugin's configuration match its defaults (e.g.
  `defaultConfiguration()` or `setConfiguration()` in the plugin).

## F15: Config pages have no label in entity lists

- **Found:** 2026-09-26, making config pages hosts in 13c.
- **Symptom:** `paragraphsBlokkliEntitiesSearch` (the editor's lists of hosts,
  e.g. edit states and import) returns `label: null` for
  `translatable_config_pages`.
- **Cause:** `EntitiesSearch`
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/EntitiesSearch.php:231-259`)
  selects the entity type's label key in SQL. `translatable_config_pages` has
  none, so it selects `''`. `label()` would return the bundle's label.
- **Fix idea:** fall back to the bundle label when the entity type has no label
  key. The item alter hook (`paragraphs_blokkli_entities_search_item`) is a
  site-level workaround.

## F16: Mutations ignore a field's allowed types

- **Found:** 2026-09-26, checking block-transfer in 13c.
- **Symptom:** `add` and `import` put a block type into a paragraphs field that
  doesn't allow it (a text block into the page's sidebar, which allows button,
  contact and downloads), and publishing keeps it. Drupal's entity form then
  refuses to save the host: "This entity (paragraph: N) cannot be referenced."
- **Cause:**
  - `AddMutationBase::createAndAddParagraph()`
    (`src/Plugin/ParagraphsBlokkli/AddMutationBase.php:109`) validates the new
    paragraph, but not the host field's `target_bundles`.
  - `Import` (`src/Plugin/ParagraphsBlokkli/Mutation/Import.php:170-178`) only
    checks create access per bundle.
  - Publishing validates paragraphs (`validation_types`), not the references of
    the host's fields.
- **Impact:**
  - Only the editor's UI enforces allowed types: any client of the GraphQL API
    (or a UI bug) can break them.
  - The nesting depth relies on them (F10), so a deeper structure can lose
    blocks on publish.
- **More mutations** (13d):
  - `add_reusable` put a text library block into the sidebar. The node form then
    refused to save: "The Reusable paragraph field cannot contain a Text
    paragraph, because the parent Sidebar field disallows it."
  - `add_from_template` checks nothing: no host access, no create access, no
    template access, no allowed types (by reading).
  - `make_reusable` checks neither `create paragraph library item` nor the
    type's `allow_library_conversion` (by reading; F12 relies on it).
  - `add_reusable` loads the item with `accessCheck(FALSE)`
    (`AddReusable.php:72-76`), so unpublished items can be placed (by reading).
- **Fix idea:** check the target field's allowed bundles wherever a mutation
  places a paragraph into a field (checked here: `add` and `import`; the other
  mutations are likely the same), or validate the host's reference fields on
  publish.

## F17: `detach_reusable` bugs

- **Found:** 2026-09-27, 13d, reproduced
  (`tmp/drupal-reusable-mutations.sh f17`).
- **Symptoms and causes**
  (`src/Plugin/ParagraphsBlokkli/Mutation/DetachReusable.php`):
  - **A block that isn't from the library** fails with an internal server error,
    "Field field_reusable_paragraph is unknown". The guard
    `if (!$fromLibrary->bundle() === 'from_library')` (line 60) is always false.
  - **An unknown uuid first in the list** returns success and detaches nothing:
    the `return` inside the loop (lines 55-74) ends the mutation at the first
    uuid it skips.
  - **Two blocks of the same item detached at once** get the same uuid: the
    clone's uuid is derived from the library paragraph's uuid (line 85,
    `getUuidForNewEntity`). Publishing then fails with "UNIQUE constraint
    failed: paragraphs_item.uuid", and the edit state can't be published until
    the mutation is undone.
- **Fix ideas:** `$fromLibrary->bundle() !== 'from_library'`; `continue` instead
  of `return`; derive the clone's uuid from the `from_library` block's uuid.

## F18: Links to library items and templates

- **Found:** 2026-09-27, 13d.
- **Library items:**
  - `paragraphs_blokkli_library` moves the canonical route to
    `/blokkli/library-item/{paragraphs_library_item}`, with the numeric id.
    Drupal builds links with it: open editing, the list of edit states when
    publishing, notifications, preview grants, the language switch.
  - The editor's own link (`getLibraryItemEditUrl` in the Drupal adapter) uses
    the uuid, and the documented Nuxt page loads by uuid. So Drupal's links 404.
  - **Workaround:** the page loads by id when the parameter is numeric
    (`playground-drupal/app/pages/[lang]/blokkli/library-item/[uuid].vue`, and
    the `blokkli-setup-library` skill).
- **Templates:** the canonical URL is the admin form
  (`/admin/config/content/blokkli/templates/{id}`), so Drupal's links to a
  template's edit state lead there, not to the template route. Not worked
  around.
- **Fix ideas:** one parameter for both sides, e.g. the adapter builds the link
  from the id, or Drupal's route takes the uuid. For templates, a canonical
  route the frontend serves.

## F19: Template and library search

- **Found:** 2026-09-27, 13d, by reading; the `NOT IN ()` error was confirmed
  with drush.
- **Templates aren't filtered by the field:** the Drupal adapter's
  `templatesSearch` (`src/modules/drupal/runtime/adapter/index.ts:1600-1605`,
  this repo) never sends the host the dialog passes. The server supports a
  `host` filter (`EntityQueryTemplates.php:103-128`), but it throws "Query
  condition 'p.type NOT IN ()' cannot be empty" for a host whose field has no
  target bundles (library items, templates). Fix both together.
- **`templateBundles` repeats bundles** (`TemplateBundles.php:85`): a template
  with two accordions lists `accordion` twice, and the join has no language
  condition.
- **The library search** (`LibraryItemsSearch.php`) ignores the provider's
  `status`, doesn't filter by language (labels come in the item's source
  language), and shows unpublished items to users who may see them.

## F20: Default templates with `add_multiple`

- **Found:** 2026-09-27, 13d, reproduced
  (`tmp/drupal-reusable-mutations.sh templates`).
- **Symptom:** with a default template for columns, `add_multiple` of a columns
  block with its own children gives the template's children plus the given ones
  (the agent's `add_paragraphs` uses it).
- **Cause:** `AddMultiple::createItem` (`AddMultiple.php:168-199`) applies the
  template, then adds the children. `createNestedParagraphs` only skips the
  template's children when a value for the field is given, not children
  (`AddMutationBase.php:447-450`).
- **Also:** the template root's own options aren't applied
  (`createAndAddParagraphWithTemplate` sets no behavior settings), only its
  children's (by reading).
- **Fix idea:** skip the template's children for a field that gets children.

## F21: "Add to library" needs two clicks

- **Found:** 2026-09-27, 13d, in the browser.
- **Symptom:** in the "Add to library" dialog, an editor types the label and
  clicks "Add to library". The first click only enables the button; the dialog
  stays open until a second click.
- **Cause:** the label field is a `FormText` with `lazy`
  (`src/runtime/editor/features/library/DialogMakeReusable/index.vue:32-36`), so
  `label` updates on `change`, when the field loses focus. The button is
  disabled while the label is empty (`:can-submit="!!label.length"`), and the
  click that blurs the field lands on the disabled button.
- **Fix idea:** drop `lazy` there, or enable the button from the field's current
  value.

## F22: Preview grants only work for some viewers

- **Found:** 2026-09-27, 13e. Reproduced with a second, plain logged-in user.
- **Anonymous visitors can't use a grant** where they lack `access content` and
  GraphQL access, as in the sandbox (chunk 10):
  - the grant route and `last_changed` require `access content`
    (`paragraphs_blokkli.routing.yml:62-69, 86-91`)
  - the grant adds no permissions: `PreviewGrantChecker::isEntityPreviewable()`
    has no callers outside tests
- **An unpublished host** can't be previewed by anyone who can't view it
  (`LoadHostEntity`'s view access check).
- **The link opens the default translation.** The redirect uses the host as
  loaded by the edit state (`ParagraphsBlokkliEditState.php:303`,
  `PreviewGrantController.php:95-100`), whatever language the editor was in.
- **A stale `null` for earlier visitors.** A user who loaded the edit state
  before opening the link (e.g. the preview URL without a grant) keeps getting
  `null` from `getParagraphsEditState` until the caches are cleared.
  `CanUseBlokkli` adds only `user.permissions` and `session.exists` as cache
  contexts, not the module's `paragraphs_blokkli_session` context, so its
  `FALSE` is reused after the grant. Users without a grant don't get another
  user's result.
- **Not reproduced (read in the code):** the standalone preview ignores changed
  host options (e.g. a page's header), which only the edit mode applies.
- **Fix ideas:** a route access check that accepts a valid grant, and an access
  policy that adds view permissions while a grant is valid; the session context
  on `CanUseBlokkli`'s result; the current language in `previewUrl`.

## F23: A past unpublish date blocks publishing

- **Found:** 2026-09-27, 13e.
- **Symptom:** a paragraph's "Unpublish on" date passes, and cron hasn't run
  yet. Publishing the host fails with "The 'unpublish on' date must be in the
  future." until cron has unpublished the paragraph.
- **Cause:** scheduler's `SchedulerUnpublishOnConstraintValidator` rejects every
  past unpublish date; unlike `publish_past_date`, there's no setting for it.
  blökkli validates the host's paragraphs when publishing
  (`ParagraphsBlokkliEditState.php:772-794`).
- **Reproduced** at the validation level (`$paragraph->validate()` returns the
  violation). The site's only editor is user 1, who has "publish paragraphs
  blokkli edit state with validation errors" and skips validation
  (`ParagraphsBlokkliManager.php:181-185`); other editors hit it.
- **Fix idea:** paragraphs_blokkli ignores scheduler's date constraints on
  paragraphs that cron will process, or processes due paragraphs before
  validating.

## F24: Paragraph schedules apply to one translation

- **Found:** 2026-09-27, 13e.
- **Symptom:** "Manage schedule" on a paragraph with a German translation, in
  the English editor, with a "Publish on" date. The English paragraph is hidden
  until the date; the German one is published at once and has no date.
- **Cause:** `set_paragraph_schedule` sets `publish_on`, `unpublish_on` and the
  status on the paragraph of the edit's language
  (`Mutation/SetParagraphSchedule.php:120-133`). All three are translatable. The
  dialog doesn't mention languages.
- **Impact:** a notice scheduled to disappear stays in the other languages.
- **Fix idea:** set the dates and the status on every translation, or show the
  language in the dialog.

## F25: An empty change description keeps the old log

- **Found:** 2026-09-27, 13e.
- **Symptom:** publish with a change description, then publish again without
  one. The second revision has the first one's log message.
- **Cause:** the manager sets the log only when the message isn't empty
  (`ParagraphsBlokkliManager.php:169`), and `setNewRevision()` keeps the loaded
  revision's log. Drupal's entity form clears it; blökkli doesn't.
- **Fix idea:** always set the log message on a new revision, empty or not.

## F26: "Publish if unpublished" acts on the default translation

- **Found:** 2026-09-27, 13f.
- **Symptom:** a news item published in English and unpublished in German,
  published from the German editor with "Publish if unpublished": German stays
  unpublished. The other way round (English unpublished, German published),
  publishing from the German editor publishes English.
- **Cause:** publishing loads the host through `getHostEntity()`, which returns
  the default translation (`Entity/ParagraphsBlokkliEditState.php:303`), and
  sets that one published (`ParagraphsBlokkliManager.php:175-176`). The publish
  dialog shows the status of the editor's language.
- **Impact:** an editor can't publish a translation from the editor, and may
  publish the source by accident.
- **Fix idea:** publish the translation of the edit's language.

## F27: Machine translation fails silently

- **Found:** 2026-09-27, 13f.
- **Symptom:** without a DeepL key (or on any DeepL error), "Translate texts"
  shows the error, but "Auto-translate" on a block and a field's "Translate"
  button do nothing.
- **Cause:** both return on `!response.success` without showing
  `response.errors`
  (`src/runtime/editor/features/translations/AutoTranslate/index.vue:116`,
  `src/runtime/editor/features/editable-field/Overlay/index.vue:317`, in this
  repository).
- **Fix idea:** show the errors as the dialog does, e.g. as a notification.

## F28: Labels that can't be translated

- **Found:** 2026-09-27, 13f.
- **Symptom:** on a German page, the editor shows "Visible languages" and "Hide
  globally" in English, and the fragments' labels ("Upcoming events") too.
- **Cause:**
  - The built-in global options are defined with English strings
    (`src/module.ts:44-56`). Their translation keys
    (`blockOption_bkVisibleLanguages_label`, …) exist but nothing reads them.
  - A fragment's `label` and `description` are plain strings
    (`src/global/types/definitions.ts:329`), not `DefinitionString` like option
    labels.
  - So are the chart colours' labels in `colorOptions`
    (`src/global/types/colorOptions.ts`), 13i.
- **Workaround:** playground-drupal redefines `bkVisibleLanguages` in
  `nuxt.config.ts` with labels per language. Fragments and colours have none.
- **Fix idea:** resolve the built-in labels through the editor's texts, and
  accept `DefinitionString` for fragment and colour labels.

## F29: Drops write only the source's link

- **Found:** 2026-09-27, 13f (read in the code; the demo avoids it).
- **Symptom:** a page dropped onto a button whose link field is translatable
  changes the link in the source language only. The translations keep the old
  link.
- **Cause:** `replace_entity_reference` sets the field on the paragraph as
  loaded, the default translation (`Mutation/ReplaceEntityReference.php:131`,
  `Traits/LinkOrReferenceFieldTrait.php:30`).
- **Workaround:** link fields are untranslatable in the demo (dates and links
  never are, the user's decision).
- **Fix idea:** write the translation of the edit's language, or all of them.

## F30: No hint for shared fields in a translation

- **Found:** 2026-09-27, 13f (read in the code).
- **Symptom:** "Edit translation" on a button in German shows its link like any
  other field. Changing it changes every language.
- **Cause:** content translation marks untranslatable fields "(all languages)"
  or hides them (`untranslatable_fields_hide`) only on content entity forms.
  `EditParagraphForm` extends `ParagraphsBlokkliFormBase`, a plain form.
- **Fix idea:** hide untranslatable fields in the translation form, or mark
  them.

## F31: The "add translation" dialog has no language

- **Found:** 2026-09-27, 13f.
- **Symptom:** a greyed-out language in the switcher opens a dialog titled
  `Translate "…" ()`.
- **Cause:** the title takes the language from the form's `langcode`, which the
  `entity:translate` form doesn't have; its language is `translation.id`
  (`src/runtime/editor/features/edit-form/index.vue:86-96`, in this repository).
- **Fix idea:** read `translation.id` for `entity:translate`.

## F32: Content search results in the source language

- **Found:** 2026-09-27, 13g, in the editor.
- **Results aren't translated:** `EntityQuery` (the `entity_query` search
  plugin) matches the label in any translation (`EntityQuery.php:125`), but maps
  the loaded entity as it is (`:130`, `:160`). In the German editor, "rathaus"
  finds the town hall, listed as "Town hall". The provider's label, a config
  override, is translated. **Fix idea:** the entity repository's
  `getTranslationFromContext()` in `mapEntity()`.
- **No text for `string_long` fields:** `TEXT_FIELD_TYPES` (`:46`) lacks
  `string_long`, so a lead (`field_lead`) never shows below the title. This is
  13c's note on `getEntityText()`. The other half of that note doesn't hold:
  unchecked text fields are stored as `0`, and `hasField('0')` skips them.

## F33: Transform plugins don't get the language

- **Found:** 2026-09-27, 13g, with the "Search and replace" transform.
- **Symptom:** a transform that `applies()` in a translation changes the
  paragraph's source language, not the translation being edited.
- **Cause:** `applies()` gets the langcode, but `transform()` doesn't: the
  `Transform` mutation (`Transform.php:123`) has no langcode argument. The
  frontend's `pbApplyTransformPlugin`
  (`src/modules/drupal/graphql/features/transform.graphql:25-43`, in this
  repository) declares `$langcode` but never passes it.
- **Workaround:** `SearchAndReplace` in `blokkli_playground` takes the current
  content language from the request, which has the language's prefix.
- **Fix idea:** a `langcode` argument on the `transform` field, passed to
  `transform()` (or set on the mutation context).

## F34: The table of contents links to hidden nested headings

- **Found:** 2026-09-27, 13i, reading the code while building the table of
  contents. Not reproduced in the browser: the demo has no nested title limited
  to some languages.
- **Symptom:** a title inside a section, limited to German with "Visible
  languages", still gets a link in the English table of contents. The title
  isn't rendered, so the link leads nowhere.
- **Cause:** `queryBlocks()` starts from the field's list, which `BlokkliField`
  filters by visibility (`src/runtime/components/BlokkliField.vue:282`, in this
  repository), but walks nested paragraphs from their raw props
  (`src/runtime/composables/useBlokkliHelper.ts:105`). `BlokkliTableOfContents`
  then only skips "Hidden globally"
  (`src/modules/table-of-contents/runtime/components/BlokkliTableOfContents/index.vue:67`).
- **With a passed list** (`queryBlocks()`'s second argument,
  `BlokkliTableOfContents`'s `list` prop, as in the detail page's sidebar), the
  top-level blocks aren't filtered either, and while editing they're the saved
  ones. See the TODO in `BlokkliTableOfContents`.
- **Fix idea:** check `isVisibleByOptions()` with the provider's language, and
  `isVisible`, for nested paragraphs in `walkBlocks()`, so that every
  `queryBlocks()` caller gets what's rendered.

## F35: A data source's colour overrides apply to one language

- **Found:** 2026-09-28, 13i, with the budget chart (a donut bound to a data
  source).
- **Symptom:** an editor sets a slice's colour in the English editor; the German
  page shows the palette's colour.
- **Cause:** `categoryColorOverrides` and `seriesOverrides` are keyed by the
  fetched names
  (`src/modules/charts/runtime/components/ChartRenderer/index.vue:146-170`, in
  this repository), and the docs tell integrators to localize those names in the
  data source.
- **Workaround:** none; the demo keeps the palette's colours (a pie of six
  slices at most).
- **Fix idea:** an optional stable `key` per category and series in
  `ChartDataSourcePayload`, used for the overrides when present.

## F36: The `translations` option ignores English

- **Found:** 2026-09-28, 13i, reading the code for the analyzer's strings.
- **Symptom:** `blokkli.translations.en` has no effect, although the docs
  (`docs/configuration.md`, `docs/editor/translations.md`) use it to override
  English texts.
- **Cause:** the template only builds loaders for `TRANSLATION_LANGUAGES` (`de`,
  `fr`, `it`, `gsw_CH`) (`src/build/templates/definitions/translations.ts:13`,
  in this repository), and the text provider falls back to the default in the
  code when a language has no loader
  (`src/runtime/editor/providers/texts.ts:69`).
- **Workaround:** English texts go in the code, as `$t()`'s default.
- **Fix idea:** a loader for `en` that returns `userTranslations.en` when it's
  set.

## F37: The iframe height editor isn't translated

- **Found:** 2026-09-28, 13i, with the embed paragraph type.
- **Symptom:** in the German and French editor, the height editor
  ("Iframe-Grösse bearbeiten") shows "Presets", "Breakpoints" and "The block
  must be rendered on the page before iframe heights can be configured." in
  English.
- **Cause:** the strings are literals in the template
  (`src/modules/iframes/runtime/features/iframes/Editor/index.vue:57-109`, in
  this repository), not `$t()` calls.
- **Workaround:** none; the labels are short and the presets show their widths.
- **Fix idea:** `$t()` with keys, then `bun run texts` and the DE and FR
  translations (`/translations` skill).

## F38: Editors can't view paragraph types

- **Found:** 2026-09-28, 13h, logged in as the first non-admin editor.
- **Symptom:** the editor opens and edits, but its add list is empty: an editor
  can't add any paragraph. Admins see every type.
- **Cause:** the frontend loads the types with
  `entityQuery(entityType: PARAGRAPHS_TYPE)`
  (`src/modules/drupal/graphql/base/query.pbConfig.graphql`, in this
  repository), and graphql_core_schema returns `null` for every item the user
  may not view (`src/Wrappers/QueryConnection.php:66`, in graphql_core_schema
  1.0.28). Paragraphs' `ParagraphsTypeAccessControlHandler` only opens
  `view label` (with `access content`); `view` needs
  `administer paragraphs types`. The starterkit works around it in its custom
  module (`blokkli_starterkit_paragraphs_type_access()`).
- **Workaround:** `blokkli_playground`'s `ParagraphsTypeHooks` grants `view`
  with `view paragraphs blokkli edit state`. Documented in the configuration
  docs and the skills.
- **Fix idea:** the same hook in paragraphs_blokkli, or the types from a data
  producer of its own that checks blökkli's permission.

## F39: The editor ignores `create_comments`

- **Found:** 2026-09-28, 13h, reading the code. Not reproduced: every demo role
  that sees comments may post them.
- **Symptom:** a user with `view blokkli comments` but without
  `post blokkli comments` gets the add and reply forms; posting fails without a
  message.
- **Cause:** the adapter loads `create_comments`
  (`src/modules/drupal/graphql/base/query.pbConfig.graphql`, in this
  repository), but nothing in `src/runtime/editor/features/comments` checks it.
- **Fix idea:** hide the forms and the "Add comment" action without it.

## F40: A new comment without a mention notifies nobody

- **Found:** 2026-09-28, 13h.
- **Symptom:** an editor comments on a page; the other people working on it
  aren't notified unless they're mentioned.
- **Cause:** the comment module only creates `comment:mention`, `comment:reply`,
  `comment:thread` and `comment:resolved`
  (`modules/paragraphs_blokkli_comment/src/CommentNotifier.php`).
- **Workaround:** mention the reviewer (the demo's flow, 13h).
- **Fix idea:** notify the edit state's owner of new comments on their page.

## F41: Every comment is marked as edited

- **Found:** 2026-09-28, 13h.
- **Symptom:** every comment and reply shows "(edited)" in the editor, right
  after it was posted.
- **Cause:** the GraphQL field `updated` returns the `changed` time whenever it
  exists, and it's set on every save
  (`modules/paragraphs_blokkli_comment/src/Plugin/GraphQL/SchemaExtension/ParagraphsBlokkliCommentExtension.php:174-180`).
- **Fix idea:** return `NULL` while `changed` equals `created`.

## F42: Uploads skip media create access

- **Found:** 2026-09-28, 13h. Reproduced: the translator, without
  `create image media`, pasted an image and got a media entity.
- **Symptom:** any user who may add a paragraph to the page can create media by
  pasting or dropping images and files, whatever their media permissions.
- **Cause:** `FileUploadMutationBase` checks paragraph create access and host
  update access
  (`src/Plugin/ParagraphsBlokkli/FileUploadMutationBase.php:174-175`), then
  creates and saves the media (`:337`, `:372`) without the media type's create
  access.
- **Workaround:** none; the permissions skill says media permissions don't
  prevent uploads.
- **Fix idea:** check the media type's create access before creating it, and
  offer the clipboard only when the user has it.

## F43: Translators can't be limited to translating

- **Found:** 2026-09-28, 13h, with the French translator.
- **Symptom:** a translator who can translate in the editor can also change the
  source language's page, including its structure.
- **Cause:** `blokkliProps` gives `edit` only with update access to the host
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/BlokkliProps.php`),
  and core's translation permissions don't grant update access to a translation.
  So translators need `edit any <type> content`.
- **Workaround:** none; the translator role has it (13h).
- **Fix idea:** a paragraphs_blokkli permission that gives `edit` in translation
  mode only, for translations the user may translate, and limits the mutations
  to texts in those languages.

## F44: No approval step

- **Found:** 2026-09-28, 13h. The user chose a reviewer who only comments.
- **Symptom:** a reviewer can't publish without edit rights, and an editor can't
  be kept from publishing.
- **Cause:** publishing needs `edit` and update access to the host, the same as
  editing (`canPublish` in
  `modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/PublishOptions.php:88`).
  The editor has an unused `review` edit mode and never reads
  `publishOptions.canPublish` (`src/runtime/editor/providers/state.ts`, in this
  repository).
- **Fix idea:** a publish permission of its own, a review mode that publishes,
  and an "approved" notification (the editor already has the type
  `edit-state:approved`).

## F45: "Replace" fails on link fields

- **Found:** 2026-09-28, while turning the button into the generic `link`
  paragraph. Reproduced through the adapter's `mediaLibraryReplaceMedia` on a
  link's `field_link`.
- **Symptom:** the media library offers to replace the target of a link field
  that an entity mapping allows media for (here `media__document` →
  `link.field_link`), and the mutation fails: "The requested field 'field_link'
  is not an entity reference field."
- **Cause:** `ReplaceMedia::execute()`
  (`src/Plugin/ParagraphsBlokkli/Mutation/ReplaceMedia.php:80`) calls
  `updateEntityReferenceField()`, which only takes entity reference fields
  (`src/Plugin/ParagraphsBlokkli/UpdateFieldValueTrait.php:157`). The droppable
  field config lists link fields as well
  (`ParagraphsBlokkliHelper::getDroppableFieldType()`).
- **Workaround:** none needed for the demo; dropping a document into a link list
  adds a new link.
- **Fix idea:** set the value with `setLinkOrEntityReferenceFieldValue()`
  (`src/Traits/LinkOrReferenceFieldTrait.php`), as `add_entity_reference` and
  `replace_entity_reference` do.

## F46: A pasted URL can't become a link

- **Found:** 2026-09-28, with the generic `link` paragraph, by reading the code.
- **Symptom:** pasting a URL creates a text paragraph with the URL, even where a
  link paragraph would fit.
- **Cause:** the editor asks the adapter for a bundle for `{ type: 'link' }`
  (`src/runtime/editor/features/clipboard/index.vue:701`, in this repository),
  but the Drupal adapter's `clipboardMapBundle` only maps video, plain text,
  images and files (`src/modules/drupal/runtime/adapter/index.ts:1420`, in this
  repository). The clipboard item is then text, and paragraphs_blokkli has no
  mutation that creates a link paragraph from a URL.
- **Fix idea:** a clipboard config for URLs in paragraphs_blokkli (paragraph
  types with a link field, like the file mapping), a mutation that sets the link
  field, and the mapping in the Drupal adapter.
