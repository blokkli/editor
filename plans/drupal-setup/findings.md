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
| F12 | ["Make reusable" on a container with unpublished children](#f12-make-reusable-on-a-container-with-unpublished-children) | `paragraphs_blokkli` | medium   | to verify  | 13d      |
| F13 | [`bkVisibleLanguages` on library blocks](#f13-bkvisiblelanguages-on-library-blocks)                                     | `@blokkli/editor`    | low      | open       | –        |
| F14 | [The comment filter leaks into new text formats](#f14-the-comment-filter-leaks-into-new-text-formats)                   | `paragraphs_blokkli` | low      | open       | –        |
| F15 | [Config pages have no label in entity lists](#f15-config-pages-have-no-label-in-entity-lists)                           | `paragraphs_blokkli` | low      | open       | –        |
| F16 | [Mutations ignore a field's allowed types](#f16-mutations-ignore-a-fields-allowed-types)                                | `paragraphs_blokkli` | medium   | open       | –        |

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
  Not reproduced yet.
- **Suspected symptom:** making a container block (e.g. a section) reusable
  before publishing loses the children that were added or moved since the last
  publish.
- **Cause (suspected):**
  - `MakeReusable`
    (`src/Plugin/ParagraphsBlokkli/Mutation/MakeReusable.php:79-131`) moves the
    container into a new library item and removes it from the edit state. Its
    children stay behind, with the container as their parent.
  - On publish, `rebuildFields()` only walks down from the host's fields.
    `from_library` holds the library item through a plain entity reference, so
    the container's child list is never rebuilt.
  - The only test publishes first
    (`TemplateLibraryIntegrationTest.php:352-398`).
- **In this plan:** containers get no library conversion until 13d tests it.

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
- **Fix idea:** check the target field's allowed bundles wherever a mutation
  places a paragraph into a field (checked here: `add` and `import`; the other
  mutations are likely the same), or validate the host's reference fields on
  publish.
