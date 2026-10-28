# Findings: upstream bugs

Bugs found while building the sandbox that belong in other projects, mostly
`paragraphs_blokkli`. They're tracked here and fixed separately. A fixed one is
removed; its commit names it.

Code references are relative to the `paragraphs_blokkli` repository at `32bbcfe`
(2.0.x), unless noted otherwise.

| #    | Finding                                                                                                                                                                   | Project                   | Severity | Status     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------- | ---------- |
| F40  | [A new comment without a mention notifies nobody](#f40-a-new-comment-without-a-mention-notifies-nobody)                                                                   | `paragraphs_blokkli`      | low      | open       |
| F46  | [A pasted URL can't become a link](#f46-a-pasted-url-cant-become-a-link)                                                                                                  | both                      | low      | open       |
| F50  | [Any GraphQL user can create text keys](#f50-any-graphql-user-can-create-text-keys)                                                                                       | `texts`                   | low      | open       |
| F97  | [The edit extension still requires the entity query extension](#f97-the-edit-extension-still-requires-the-entity-query-extension)                                         | `paragraphs_blokkli`      | low      | to verify  |
| F114 | [A date after 2038 can't be scheduled on MySQL](#f114-a-date-after-2038-cant-be-scheduled-on-mysql)                                                                       | `paragraphs_blokkli`      | low      | open       |
| F120 | [A mutation from a text or form body runs as the user](#f120-a-mutation-from-a-text-or-form-body-runs-as-the-user)                                                        | `nuxt-graphql-middleware` | low      | workaround |
| F121 | [The library's query access finds unpublished items that its access handler hides](#f121-the-librarys-query-access-finds-unpublished-items-that-its-access-handler-hides) | `paragraphs`              | low      | open       |
| F127 | [Some fields of the edit state read the page without building it](#f127-some-fields-of-the-edit-state-read-the-page-without-building-it)                                  | `paragraphs_blokkli`      | medium   | to verify  |
| F128 | [The list of pages offers pages that blökkli doesn't edit](#f128-the-list-of-pages-offers-pages-that-blökkli-doesnt-edit)                                                 | `paragraphs_blokkli`      | low      | to verify  |
| F129 | [The page attachments name a route that doesn't exist](#f129-the-page-attachments-name-a-route-that-doesnt-exist)                                                         | `paragraphs_blokkli`      | low      | to verify  |

Statuses: `to verify` (read in the code, not reproduced), `open`, `workaround`
(the sandbox works around it).

## F40: A new comment without a mention notifies nobody

- **Found:** 2026-09-28, 13h.
- **Symptom:** an editor comments on a page; the other people working on it
  aren't notified unless they're mentioned.
- **Cause:** the comment module only creates `comment:mention`, `comment:reply`,
  `comment:thread` and `comment:resolved`
  (`modules/paragraphs_blokkli_comment/src/CommentNotifier.php`).
- **Workaround:** mention the reviewer (the demo's flow, 13h).
- **Fix idea:** notify the edit state's owner of new comments on their page.

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

## F50: Any GraphQL user can create text keys

- **Found:** 2026-09-27, 13f.
- **Symptom:** the texts resolvers create a text for every unknown key, without
  an access check (`TextsTranslator::trans()`, `src/TextsTranslator.php:117` in
  `texts`). Any user with GraphQL access can fill the table: on the dev site,
  everyone, with `blokkli_playground_public`. Sandboxes are safe from it since
  2026-10-25: nginx refuses Drupal's GraphQL endpoint to the browser there, and
  the app's operations name their keys as literals
  (`app/graphql/fragment.easyTexts.graphql`). From 2026-10-14, nginx refused
  `/graphql`, but any logged-in user still reached it as `/index.php/graphql`.
- **Fix idea:** create keys only with a permission, or only in development.

## F97: The edit extension still requires the entity query extension

- **Found:** 2026-10-12, by reading, when the editor got the paragraph types
  from a query of the module's own (the former F38).
- **Symptom:** none. A GraphQL server with `paragraphs_blokkli_edit` must have
  graphql_core_schema's `entity_query` extension enabled, which adds
  `entityQuery`, `entityById` and `entityByUuid` to the schema of every site.
- **Cause:** `EditExtension::getExtensionDependencies()` returns
  `['entity_query']`. The editor's only use of it was the list of paragraph
  types. Not checked: whether the module's schema needs anything else of that
  extension.
- **Impact:** low: queries in the schema that a project may not want.
- **Fix idea:** drop the dependency, if a server without the extension still
  builds its schema.

## F114: A date after 2038 can't be scheduled on MySQL

- **Found:** 2026-10-13, in a kernel test of the scheduling (MariaDB), when the
  dates got their one format.
- **Symptom:** scheduling an edit state for a date after 2038-01-19 fails with
  "Numeric value out of range: 1264 Out of range value for column 'publish_on'".
  The mutation answers with a server error, not with a reason. On SQLite, as in
  the sandbox, the date is stored. By reading, the same goes for the dates of a
  paragraph, which are the scheduler module's fields of the same type.
- **Cause:** `publish_on` is a `timestamp` field, which Drupal stores in a
  signed 32-bit column. `ScheduleEditState`
  (`modules/paragraphs_blokkli_scheduler/src/Plugin/GraphQL/DataProducer/ScheduleEditState.php`)
  only refuses a date that is too soon.
- **Impact:** low: no one schedules that far ahead today. Whether the editor's
  date input lets a user pick such a date is not checked.
- **Fix idea:** refuse a date that the column can't hold, with a message, where
  the date is read (`BlokkliDate::parse()` or its two callers).

## F120: A mutation from a text or form body runs as the user

- **Found:** 2026-10-24, with the XSS plan; reproduced in an E2E sandbox with
  `pbTakeOwnership` on a node that doesn't exist.
- **Symptom:** a POST to `/api/graphql_middleware/mutation/<name>` with a
  `text/plain` or form-encoded body and the user's session cookie runs the
  mutation as the user, whatever its `Origin`. `SameSite=Lax` only keeps other
  sites from sending the cookie; a page on another host of the same site can.
- **Cause:** the mutation handler of nuxt-graphql-middleware 5.4.0
  (`dist/runtime/server/api/mutation.js`) reads the body with h3's `readBody()`,
  which takes any content type, and checks neither the type nor the origin.
  Drupal's own endpoint refuses such requests (`QueryRouteEnhancer` in
  drupal/graphql).
- **Workaround:** the sandbox's nginx answers 415 to a mutation that isn't
  `application/json` (`$blokkli_mutation_refused` in
  `.ddev/nginx_full/nginx-site.conf`).
- **Impact:** low here: none of the sandbox's hosts could send one, and nginx
  refuses it now. Higher for a site that shares its domain with hosts that serve
  other people's content.
- **Fix idea:** refuse a mutation whose content type isn't `application/json`,
  with a 415. A JSON POST from another origin needs a CORS preflight.

## F121: The library's query access finds unpublished items that its access handler hides

- **Found:** 2026-10-25, while fixing the library search's totals, by reading. A
  kernel test showed that content moderation's access makes the two agree.
- **Symptom:** a user with "view any unpublished content" but without
  "administer paragraphs library" gets unpublished library items from an entity
  query with access checks, but may not view them. The library search counts
  them in its total and then leaves them out, so a page of results comes up
  short. The sandbox's editors are such users: `view_unpublished` gives them the
  permission.
- **Cause:** Paragraphs 8.x-1.23. Its query access
  (`paragraphs_library_query_paragraphs_library_item_access_alter()`) lets
  either permission see unpublished items. Its access handler
  (`LibraryItemAccessControlHandler`) only lets the admin permission view them.
  With content moderation, the two agree: content moderation lets "view any
  unpublished content" view any unpublished entity. `view_unpublished` only
  grants access to nodes.
- **Fix idea:** the access handler allows viewing for "view any unpublished
  content" too, or the query access only for the admin permission. Upstream, in
  Paragraphs.

## F127: Some fields of the edit state read the page without building it

- **Found:** 2026-10-27, by reading, while fixing the former F89. Not
  reproduced.
- **Symptom:** the editor's dialog for a reference field of the page lists the
  items as they're stored: what the edit state changed in that field is missing.
  Saving the dialog sends the whole list
  (`src/runtime/editor/features/droppable-field-edit/Overlay/index.vue:325-336`,
  `:594-599`), so it would undo those changes.
- **Cause:**
  - `DroppableFieldItems::findTarget()` returns `$state->getHostEntity()` for a
    field of the page, without building the state
    (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/DroppableFieldItems.php:113-116`
    at `ebb510d`). A paragraph's field comes from the built state (:118-124).
  - The adapter queries the field on its own
    (`src/modules/drupal/graphql/features/droppable-field-items.graphql`), so no
    other field of the request builds the state first.
  - `translationState` and `publishOptions` also read `getHostEntity()` without
    a build (`ParagraphsBlokkliTranslationState.php:81`,
    `PublishOptions.php:84`). In the editor's fragment they come after
    `textFieldValues`, which builds
    (`src/modules/drupal/graphql/base/fragment.paragraphsBlokkliEditState.graphql:13`,
    `:40`, `:58`), so they see the built page. In another query they would see
    the stored one.
- **Impact:** medium, if it holds: a second change of the same field of the page
  drops the first.
- **Fix idea:** build the state in these producers before they read the page,
  e.g. with a method of the edit state that returns the built host.

## F128: The list of pages offers pages that blökkli doesn't edit

- **Found:** 2026-10-28, by reading, while fixing the former F126. Not
  reproduced.
- **Symptom:** "Switch page" lists a page whose latest revision isn't its
  default one. Opening it leads to the page without the editor, and nothing says
  why.
- **Cause:**
  - `EntitiesSearch::resolve()` leaves out the bundles that content moderation
    moderates
    (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/EntitiesSearch.php:154-157`
    at `5ca540b`), but a bundle's items come from one query, without a look at
    their revisions (`queryItemsForBundle()`, :262).
  - Since the fix of the former F126,
    `ParagraphsBlokkliConfig::isEnabledForEntity()` is false for such a page
    (`hasPendingRevision()`). `BlokkliProps` then gives no permissions
    (`BlokkliProps.php:129-131` at `5ca540b`), so the editor doesn't start.
  - The settings form and the status report name a moderated bundle; a page with
    a pending revision isn't named anywhere.
- **Impact:** low: only pages with a pending revision, which blökkli itself
  never saves.
- **Fix idea:** leave such entities out of the query (a condition against the
  revision table), and say why blökkli is off for a page, e.g. in what the
  frontend reads from `BlokkliProps`, or in the entity's form.

## F129: The page attachments name a route that doesn't exist

- **Found:** 2026-10-28, by reading, while fixing the former F126. Not
  reproduced.
- **Symptom:** perhaps none: the node form that blökkli opens in its iframe may
  lack the module's iframe styles (`css/iframe_modal.css`).
- **Cause:**
  - `paragraphs_blokkli_preprocess_html()` and
    `paragraphs_blokkli_page_attachments()` check for a route
    `paragraphs_blokkli.edit_host_entity_form` (`paragraphs_blokkli.module:32`,
    `:55` at `5ca540b`). `paragraphs_blokkli.routing.yml` doesn't define it, and
    never did in this repository.
  - blökkli opens the node form through `EntityFormController`, a redirect to
    the entity's `edit-form` with `?paragraphsBlokkli=true`
    (`src/Controller/EntityFormController.php:36-41`). The preprocess hook
    checks that query parameter as well; the attachments hook only checks
    routes, so it never attaches `iframe_modal` to the node form.
- **Impact:** low: dead code, and perhaps a missing stylesheet.
- **Fix idea:** remove the route name; check whether the node form needs
  `iframe_modal`, and if so attach it for the query parameter, as the preprocess
  hook does.
