# Findings: upstream bugs

Bugs found while building the sandbox that belong in other projects, mostly
`paragraphs_blokkli`. They're tracked here and fixed separately. A fixed one is
removed; its commit names it.

Code references are relative to the `paragraphs_blokkli` repository at `32bbcfe`
(2.0.x), unless noted otherwise.

| #    | Finding                                                                                                                           | Project                   | Severity | Status     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------- | ---------- |
| F40  | [A new comment without a mention notifies nobody](#f40-a-new-comment-without-a-mention-notifies-nobody)                           | `paragraphs_blokkli`      | low      | open       |
| F46  | [A pasted URL can't become a link](#f46-a-pasted-url-cant-become-a-link)                                                          | both                      | low      | open       |
| F97  | [The edit extension still requires the entity query extension](#f97-the-edit-extension-still-requires-the-entity-query-extension) | `paragraphs_blokkli`      | low      | to verify  |
| F114 | [A date after 2038 can't be scheduled on MySQL](#f114-a-date-after-2038-cant-be-scheduled-on-mysql)                               | `paragraphs_blokkli`      | low      | open       |
| F120 | [A mutation from a text or form body runs as the user](#f120-a-mutation-from-a-text-or-form-body-runs-as-the-user)                | `nuxt-graphql-middleware` | low      | workaround |
| F128 | [The list of pages offers pages that blökkli doesn't edit](#f128-the-list-of-pages-offers-pages-that-blökkli-doesnt-edit)         | `paragraphs_blokkli`      | low      | to verify  |

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
