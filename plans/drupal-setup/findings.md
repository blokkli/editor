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
| F95  | [A refused batch of texts names one text, without its language](#f95-a-refused-batch-of-texts-names-one-text-without-its-language)                                        | both                      | low      | open       |
| F97  | [The edit extension still requires the entity query extension](#f97-the-edit-extension-still-requires-the-entity-query-extension)                                         | `paragraphs_blokkli`      | low      | to verify  |
| F102 | [The library search fails for an empty list of types](#f102-the-library-search-fails-for-an-empty-list-of-types)                                                          | `paragraphs_blokkli`      | low      | open       |
| F103 | [A preview misses a change that is made before its first poll](#f103-a-preview-misses-a-change-that-is-made-before-its-first-poll)                                        | editor                    | low      | open       |
| F104 | [A refused machine translation answers "Internal server error"](#f104-a-refused-machine-translation-answers-internal-server-error)                                        | `paragraphs_blokkli`      | low      | open       |
| F110 | [The Search API lists show what the index returns](#f110-the-search-api-lists-show-what-the-index-returns)                                                                | `paragraphs_blokkli`      | low      | to verify  |
| F111 | [A new target resets the options of a link](#f111-a-new-target-resets-the-options-of-a-link)                                                                              | `paragraphs_blokkli`      | low      | to verify  |
| F112 | [A text update of a link field does nothing, and is stored](#f112-a-text-update-of-a-link-field-does-nothing-and-is-stored)                                               | `paragraphs_blokkli`      | low      | open       |
| F113 | [The comment module's schema extension needs the GraphQL submodule](#f113-the-comment-modules-schema-extension-needs-the-graphql-submodule)                               | `paragraphs_blokkli`      | low      | to verify  |
| F114 | [A date after 2038 can't be scheduled on MySQL](#f114-a-date-after-2038-cant-be-scheduled-on-mysql)                                                                       | `paragraphs_blokkli`      | low      | open       |
| F115 | [A violation of a host's paragraphs field names no entity](#f115-a-violation-of-a-hosts-paragraphs-field-names-no-entity)                                                 | `paragraphs_blokkli`      | low      | to verify  |
| F116 | [A comment can be edited or deleted through any page](#f116-a-comment-can-be-edited-or-deleted-through-any-page)                                                          | `paragraphs_blokkli`      | low      | open       |
| F117 | [An add or a move into a field that blökkli doesn't manage is lost](#f117-an-add-or-a-move-into-a-field-that-blökkli-doesnt-manage-is-lost)                               | `paragraphs_blokkli`      | low      | to verify  |
| F120 | [A mutation from a text or form body runs as the user](#f120-a-mutation-from-a-text-or-form-body-runs-as-the-user)                                                        | `nuxt-graphql-middleware` | low      | workaround |
| F121 | [The library's query access finds unpublished items that its access handler hides](#f121-the-librarys-query-access-finds-unpublished-items-that-its-access-handler-hides) | `paragraphs`              | low      | open       |
| F124 | [The lists of pages show one name for bundles of the same name](#f124-the-lists-of-pages-show-one-name-for-bundles-of-the-same-name)                                      | both                      | low      | to verify  |
| F125 | [The state at a history index may be the current state](#f125-the-state-at-a-history-index-may-be-the-current-state)                                                      | `paragraphs_blokkli`      | medium   | to verify  |
| F126 | [A build starts from another revision than the forms](#f126-a-build-starts-from-another-revision-than-the-forms)                                                          | `paragraphs_blokkli`      | low      | to verify  |
| F127 | [Some fields of the edit state read the page without building it](#f127-some-fields-of-the-edit-state-read-the-page-without-building-it)                                  | `paragraphs_blokkli`      | medium   | to verify  |

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

## F95: A refused batch of texts names one text, without its language

- **Found:** 2026-10-12, while the translate dialog and the import of
  translations got the message of a refused text in its row (the former F87).
- **Symptom:** when several texts of a batch don't fit their fields, Drupal
  names the first one. The user corrects it, applies again and gets the next. In
  an import of several languages, the row is marked but not the language: the
  message stands beneath the source text.
- **Cause:** `bulk_translate_field_values` and `bulk_update_field_values` write
  their items one after the other, and the first value that the field refuses
  ends the mutation (`UpdateFieldValueTrait::updateFieldValueByType()`). A
  violation has the entity and the property path, not the language
  (`ParagraphsEditViolation`).
- **Impact:** low. The agent's text tools have the same: one refused field per
  attempt.
- **Fix idea:** when such a mutation is added, collect the violations of every
  item and refuse the batch with all of them. Give a violation its `langcode`.
  Stored mutations aren't validated, so they replay as they do.

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

## F102: The library search fails for an empty list of types

- **Found:** 2026-10-12, while probing the queries behind the editor's gate (the
  former F99).
- **Symptom:** `paragraphsBlokkliSearchLibraryItems(bundles: [])` answers
  "Internal server error". With a paragraph type in the list it answers.
  Verified over HTTP in an E2E sandbox.
- **Cause:** not looked at. Probably a condition on an empty list in
  `EntityQueryLibraryItems`.
- **Impact:** low: the editor always names the types.
- **Fix idea:** no results for an empty list.

## F103: A preview misses a change that is made before its first poll

- **Found:** 2026-10-12, by the E2E spec for the preview link
  (`test/e2e-drupal/features/preview-grant/base.test.ts`), which waits for the
  first poll because of it.
- **Symptom:** a preview that is opened on its own (a preview link, or "Preview
  (new window)") follows the changes of the editor. A change that is made within
  the first second after it has loaded doesn't show, until the next change.
- **Cause:** `PreviewProvider.vue`
  (`src/runtime/editor/components/PreviewProvider.vue`) starts with
  `lastChanged = 0` and asks the adapter for the time of the last change a
  second after it has mounted (five seconds for an adapter without
  `getLastChanged`). The first answer is only kept, to compare the next one
  with: what changed between loading the state and that answer is never loaded.
- **Impact:** low: a short window, and the next change shows both.
- **Fix idea:** start from the time of the loaded state (`lastChanged` of
  `mapState()`'s result, which the Drupal adapter fills).

## F104: A refused machine translation answers "Internal server error"

- **Found:** 2026-10-12, with the fix of the editor's gate (the former F99).
- **Symptom:** `paragraphsBlokkliRequestTranslation` answers someone who may not
  use the editor with the error "Internal server error" and without data.
  Verified over HTTP, as an anonymous visitor with a preview grant.
- **Cause:** the mutation's type is `ParagraphsBlokkliTranslationResult!`, and
  its resolver returns nothing where the gate refuses
  (`modules/paragraphs_blokkli_deepl/src/Plugin/GraphQL/SchemaExtension/DeeplExtension.php`).
  Not checked: whether Drupal logs each of them.
- **Impact:** low: the editor only sends it for users who may use it. The
  request is refused; its error names the wrong reason.
- **Fix idea:** a result that may be null, as the editor's other mutations have,
  or an error that says "Access denied".

## F110: The Search API lists show what the index returns

- **Found:** 2026-10-13, by reading, when the lists from an entity query got
  their check for view access (the former F101). Not reproduced; the sandbox's
  editor uses the entity query plugins.
- **Symptom:** none seen. By reading: the content search and the media library
  of `paragraphs_blokkli_search_api` list the title, the text and the image that
  the index has for a result. No entity is loaded and nobody asks whether the
  user may view it. What a user finds depends on the index alone: on its
  processors "Content access" and "Entity status", if they're enabled.
- **Cause:** `SearchApi::getResults()` and
  `SearchApiMediaLibrary::getMediaLibraryResults()`
  (`modules/paragraphs_blokkli_search_api/src/Plugin/ParagraphsBlokkli/Search/`)
  map the result items of the query. The entity query plugins load the entities
  and call `filterViewable()`.
- **Also:** the search skill (`skills/blokkli-setup-search`, "Permissions") says
  that each result is access-checked. That holds for the entity query plugin.
- **Impact:** low, to verify: titles and text excerpts, on a site whose index
  has what its editors may not view.
- **Fix idea:** load the entities of a page of results and leave out what the
  user may not view, as the entity query plugins do. Or say in the skill which
  processors the index needs.

## F111: A new target resets the options of a link

- **Found:** 2026-10-13, by reading, when a link kept its title on a new target
  (the former F9). Not reproduced.
- **Symptom:** none seen. By reading: a link item also has options, such as the
  attributes that the Link Attributes module stores. Replacing the target of a
  link through an entity mapping (`replace_entity_reference`, `replace_media`)
  writes an item with a URI and a title only, so the options are gone. Typing or
  pasting a URL keeps them: that path merges into the item.
- **Cause:** `LinkOrReferenceFieldTrait::getLinkOrEntityReferenceFieldValue()`
  (`src/Traits/LinkOrReferenceFieldTrait.php`) returns the URI and the title,
  and the mutations set that as the field's value.
- **Impact:** low: blökkli has no UI for a link's options, so they come from
  Drupal's form on a site with such a module.
- **Fix idea:** keep the options of the item, as the title is kept. Behind a new
  version of the two mutations.

## F112: A text update of a link field does nothing, and is stored

- **Found:** 2026-10-13, in the sandbox check of the link titles (the former
  F9), over GraphQL.
- **Symptom:** `update_field_value` with the name of a link field and a URI as
  its value answers with success. The link has no URL afterwards, and the edit
  state has a mutation that changes nothing. The editor doesn't send this: it
  sets a URL with `bulk_update_field_values`, which writes the URI.
- **Cause:** `UpdateFieldValueTrait::updateTextFieldValue()`
  (`src/Plugin/ParagraphsBlokkli/UpdateFieldValueTrait.php`) writes a value
  without a property into the item's `value`, which a link item doesn't have. By
  reading, the same goes for every field whose items have no `value`.
- **Impact:** low: a client of its own, or a tool of the agent, that picks the
  wrong mutation gets no error.
- **Fix idea:** refuse a field whose items have no `value` when the mutation is
  added, or write the value as `bulk_update_field_values` does.

## F113: The comment module's schema extension needs the GraphQL submodule

- **Found:** 2026-10-13, by reading, when the tests of the schema extensions'
  resolvers were written. Not reproduced: a kernel test loads the classes of
  every module, enabled or not.
- **Symptom:** none seen. By reading: `paragraphs_blokkli_comment` doesn't
  depend on `paragraphs_blokkli_graphql`, but its schema extension resolves its
  queries with data producers of that module
  (`paragraphs_blokkli_can_use_blokkli`, `paragraphs_blokkli_load_host_entity`,
  `paragraphs_blokkli_load_edit_state`). On a site with the GraphQL module and
  the comment module, but without the GraphQL submodule, a server with this
  extension fails.
- **Cause:**
  `modules/paragraphs_blokkli_comment/paragraphs_blokkli_comment.info.yml` lists
  `paragraphs_blokkli`, `filter` and `text` only. The agent's module names the
  dependency. The extension also resolves four fields with `call_method`, a data
  producer of `graphql_core_schema`: that module provides the extension's schema
  (`core_composable`), and the GraphQL submodule depends on it.
- **Impact:** low: comments are of no use over GraphQL without the edit
  extension, so no site is set up this way.
- **Fix idea:** add the dependency, or move the schema extension into
  `paragraphs_blokkli_graphql`, where the library's, the search's and the
  transform's are.

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

## F115: A violation of a host's paragraphs field names no entity

- **Found:** 2026-10-14, by reading, when the fields of a violation got their
  resolvers without a callback.
- **Symptom (by reading):** with the validation of fields on,
  `ParagraphsBlokkliEditState::validate()` adds what `$field->validate()`
  returns for each of the host's paragraphs fields. The root of those violations
  is the field item list, not the entity, so their `entityType` and `entityUuid`
  are NULL, and their property path starts below the field (empty, or e.g.
  `0.target_id`) without the field's name. The editor lists such a violation
  without a target, in the publish dialog and in the validations analyzer, so a
  user can't go to the field from it. Not checked in the browser.
- **Cause:** `ParagraphsBlokkliHelper::setValidFieldValue()` rebuilds a field's
  violations with the entity as their root and the field's name in the path ("As
  validating the entity reports it"); `validate()` doesn't.
- **Impact:** low: only with the validation of fields on, and the message is
  still shown.
- **Fix idea:** rebuild those violations as `setValidFieldValue()` does.

## F116: A comment can be edited or deleted through any page

- **Found:** 2026-10-20, by reading, when F41 was fixed. Not reproduced.
- **Symptom (by reading):** resolving a comment and ticking one of its tasks
  check that the comment belongs to the page of the edit state they're given.
  Editing and deleting it don't (`EditComment`, `DeleteComment` in
  `modules/paragraphs_blokkli_comment/src/Plugin/GraphQL/DataProducer/`): they
  only check update or delete access to the comment, which its author has. So an
  author can edit or delete their own comment on a page they may no longer view,
  through the edit state of any page they can open.
- **Impact:** low: only the author's own comments (or any comment, for a user
  with `administer blokkli_comment`, who may do that anyway).
- **Fix idea:** the same check as `ResolveComment`.

## F117: An add or a move into a field that blökkli doesn't manage is lost

- **Found:** 2026-10-21, by reading, in a review of the plan for F107. Not
  reproduced.
- **Symptom (by reading):** with "Restrict paragraph fields" on, blökkli manages
  only the enabled paragraphs fields of a host bundle. A mutation that adds or
  moves a paragraph into one of the others is accepted, and the edit state lists
  the paragraph there, but publishing doesn't save it. A moved paragraph is
  lost.
- **Cause:** the check of the mutations,
  `ParagraphsBlokkliHelper::checkAllowedParagraphBundles()`
  (`src/ParagraphsBlokkliHelper.php` at `1b08d60`), only requires a paragraphs
  field. `ParagraphsBlokkliEditState::rebuildFields()` writes the fields of
  `getAvailableHostFieldNames()`.
- **Fix idea:** refuse a field that blökkli doesn't manage, when the mutation
  runs for the first time.

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

## F124: The lists of pages show one name for bundles of the same name

- **Found:** 2026-10-26, by reading, in a search for lookups of a bundle without
  its entity type (after the former F78). Not reproduced: the sandbox's content
  types and config pages have no name in common.
- **Symptom:** "Switch page" and "Import from an existing page" show each page's
  type. When two entity types have a bundle of the same name, say a content type
  and a vocabulary both named `page`, every row of either shows the name of the
  one that came last.
- **Cause:**
  - `EntitiesSearch::resolve()`
    (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/EntitiesSearch.php:156-159`
    at `5c1ce28`) lists the bundles' names as `{id, label}`
    (`ParagraphsBlokkliEntitiesSearchLabel`), without their entity type.
  - The adapter's `getHostEntities` keys them by bundle
    (`src/modules/drupal/runtime/adapter/index.ts:1893`), and the editor looks
    them up by bundle (`getBundleLabel()`,
    `src/runtime/editor/providers/workspaces.ts:209`), for
    `features/workspace/Overlay` and `features/import-existing/Dialog`.
- **Impact:** low: only the name, and only on sites with such bundles.
- **Fix idea:** the bundles' names carry their entity type in the schema (the
  label type is shared with `entityTypeLabels`); the adapter keys them by entity
  type and bundle, and `getBundleLabel(entityType, bundle)` takes both.
- **Also:** `labelMap.label` is the first entity type's name only, and nothing
  in the editor reads it.

## F125: The state at a history index may be the current state

- **Found:** 2026-10-27, by reading, while looking into the former F89. Not
  reproduced.
- **Symptom:** the Diff view compares the current state with the state before
  any change, which it loads with `pbEditState` at history index -1
  (`loadStateAtIndex(-1)`,
  `src/runtime/editor/features/diff/DiffView/index.vue:19`). The `mutatedState`
  of that response may be the current state; the view would then show no
  changes.
- **Cause:**
  - `LoadEditState` puts the index into the GraphQL context
    (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/LoadEditState.php:107-110`
    at `cb281e6`), and only `mutatedState` reads it
    (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/SchemaExtension/EditExtension.php:795`).
  - The editor's fragment selects `textFieldValues` and `droppableFieldValues`
    before `mutatedState`
    (`src/modules/drupal/graphql/base/fragment.paragraphsBlokkliEditState.graphql:13-29`,
    since `a0bd2c683` and `1ff0f5f16`, spring 2026). Their producers build the
    state without the index (`TextFieldValues.php:86`,
    `DroppableFieldValues.php:79`).
  - `getMutatedState()` returns the build it already has, whatever index it's
    asked for (`src/Entity/ParagraphsBlokkliEditState.php:386-389`). If the
    fields resolve in the order of the query, `mutatedState` gets the current
    build.
  - The text and droppable values of the response are the current ones in any
    case: their fields take no index.
- **Impact:** medium, if it holds: the Diff view would show nothing. No test
  covers the view or a history index.
- **Fix idea:** check it first, with a kernel test of the GraphQL query or the
  Diff view in the sandbox. Then let every field of the response use the index:
  apply it to the state when it's loaded, or build once per index. A second
  build in the same request starts from the stored entities, as the first.

## F126: A build starts from another revision than the forms

- **Found:** 2026-10-27, by reading, while fixing the former F89. Not
  reproduced.
- **Symptom:** when a page's latest revision isn't its default one, the editor
  shows the default revision with the changes of the edit state, while the forms
  and the access checks use the latest revision. Publishing saves on top of the
  default revision, so what the latest revision changed is lost.
- **Cause:**
  - `getHostEntity()` loads the latest revision
    (`src/Entity/ParagraphsBlokkliEditState.php:345-353` at `ebb510d`). A build
    asks for `force_reload`, which loads the default revision with
    `loadUnchanged()` (:359).
  - The forms run the mutations on the latest revision, without a build
    (`src/Traits/EditStateFormTrait.php:39`).
  - Access is checked for the latest revision: "an edit state shows the latest
    revision of its host entity"
    (`src/ParagraphsBlokkliEditStateAccessControlHandler.php:48-50`,
    `ParagraphsBlokkliHelper::getHostAccess()`,
    `src/ParagraphsBlokkliHelper.php:1546-1576`). Its doc names a draft of
    content moderation as the example, which blökkli no longer edits.
- **Impact:** low: only a page with a latest revision that isn't the default
  one. Content moderation makes such revisions, and blökkli is off for moderated
  bundles; Workspaces, or code that saves such a revision, still can. With
  hidden shared fields, validation would also report core's message about a
  revision that isn't the default one (`defaultRevisionMessage` of
  `EntityUntranslatableFieldsConstraint`), which
  `ParagraphsBlokkliHelper::isSharedFieldChangeViolation()` doesn't filter.
- **Fix idea:** decide which revision an edit state is built on, and use it for
  the build, the forms, the access checks and the publishing.

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
