# Findings: upstream bugs

Bugs found while working on this plan that belong in other projects, mostly
`paragraphs_blokkli`. They're tracked here and fixed separately, not as part of
a chunk. Update the status when one is fixed, and name the commit or issue.

Code references are relative to the `paragraphs_blokkli` repository at `32bbcfe`
(2.0.x), unless noted otherwise.

| #   | Finding                                                                                    | Project              | Severity | Status     | Blocks   |
| --- | ------------------------------------------------------------------------------------------ | -------------------- | -------- | ---------- | -------- |
| F1  | [Duplicate edit states](#f1-duplicate-edit-states)                                         | `paragraphs_blokkli` | high     | open       | chunk 09 |
| F2  | [Lost mutations on concurrent writes](#f2-lost-mutations-on-concurrent-writes)             | `paragraphs_blokkli` | high     | open       | chunk 09 |
| F3  | [Edit state in the persistent entity cache](#f3-edit-state-in-the-persistent-entity-cache) | `paragraphs_blokkli` | low      | open       | –        |
| F4  | [`clearOutdated` type mismatch](#f4-clearoutdated-type-mismatch)                           | `paragraphs_blokkli` | low      | open       | –        |
| F5  | [Twig 3.30 breaks escaping](#f5-twig-330-breaks-escaping)                                  | Drupal core          | high     | workaround | –        |
| F6  | [Starterkit nginx routing](#f6-starterkit-nginx-routing)                                   | `blokkli_starterkit` | low      | open       | –        |

Statuses: `open`, `workaround`, `fixed`.

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
