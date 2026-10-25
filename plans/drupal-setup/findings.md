# Findings: upstream bugs

Bugs found while building the sandbox that belong in other projects, mostly
`paragraphs_blokkli`. They're tracked here and fixed separately. A fixed one is
removed; its commit names it.

Code references are relative to the `paragraphs_blokkli` repository at `32bbcfe`
(2.0.x), unless noted otherwise.

| #    | Finding                                                                                                                                                                     | Project                   | Severity | Status     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------- | ---------- |
| F24  | [Paragraph schedules apply to one translation](#f24-paragraph-schedules-apply-to-one-translation)                                                                           | `paragraphs_blokkli`      | medium   | parked     |
| F26  | ["Publish if unpublished" acts on the default translation](#f26-publish-if-unpublished-acts-on-the-default-translation)                                                     | both                      | medium   | parked     |
| F28  | [Labels that can't be translated](#f28-labels-that-cant-be-translated)                                                                                                      | `@blokkli/editor`         | low      | workaround |
| F29  | [Drops write only the source's link](#f29-drops-write-only-the-sources-link)                                                                                                | `paragraphs_blokkli`      | low      | workaround |
| F30  | [No hint for shared fields in a translation](#f30-no-hint-for-shared-fields-in-a-translation)                                                                               | `paragraphs_blokkli`      | low      | open       |
| F35  | [A data source's colour overrides apply to one language](#f35-a-data-sources-colour-overrides-apply-to-one-language)                                                        | `@blokkli/editor`         | low      | open       |
| F40  | [A new comment without a mention notifies nobody](#f40-a-new-comment-without-a-mention-notifies-nobody)                                                                     | `paragraphs_blokkli`      | low      | open       |
| F43  | [Translators can't be limited to translating](#f43-translators-cant-be-limited-to-translating)                                                                              | both                      | low      | open       |
| F44  | [No approval step](#f44-no-approval-step)                                                                                                                                   | both                      | low      | open       |
| F46  | [A pasted URL can't become a link](#f46-a-pasted-url-cant-become-a-link)                                                                                                    | both                      | low      | open       |
| F50  | [Any GraphQL user can create text keys](#f50-any-graphql-user-can-create-text-keys)                                                                                         | `texts`                   | low      | open       |
| F64  | [A template or a copy places a library item its user may not view](#f64-a-template-or-a-copy-places-a-library-item-its-user-may-not-view)                                   | `paragraphs_blokkli`      | low      | to verify  |
| F68  | [An old copy from another page gives its new paragraphs a new UUID on every replay](#f68-an-old-copy-from-another-page-gives-its-new-paragraphs-a-new-uuid-on-every-replay) | `paragraphs_blokkli`      | low      | open       |
| F70  | [A library item shares its paragraph with the page's earlier revisions](#f70-a-library-item-shares-its-paragraph-with-the-pages-earlier-revisions)                          | `paragraphs_blokkli`      | low      | open       |
| F71  | [Moving a paragraph into its own nested paragraph is refused for the wrong reason](#f71-moving-a-paragraph-into-its-own-nested-paragraph-is-refused-for-the-wrong-reason)   | `paragraphs_blokkli`      | low      | open       |
| F72  | [The editor offers places below the nesting limit](#f72-the-editor-offers-places-below-the-nesting-limit)                                                                   | editor                    | low      | open       |
| F73  | [A new paragraph of a type its field doesn't allow is no violation](#f73-a-new-paragraph-of-a-type-its-field-doesnt-allow-is-no-violation)                                  | `paragraphs`              | low      | open       |
| F74  | [The older mutations for media leave a link field empty](#f74-the-older-mutations-for-media-leave-a-link-field-empty)                                                       | `paragraphs_blokkli`      | low      | open       |
| F76  | [A search result replaces the first mapped field](#f76-a-search-result-replaces-the-first-mapped-field)                                                                     | editor                    | low      | to verify  |
| F77  | ["Add to" is offered for link fields with several values](#f77-add-to-is-offered-for-link-fields-with-several-values)                                                       | editor                    | low      | to verify  |
| F78  | [A page's link field takes a paragraph type's mapping by name](#f78-a-pages-link-field-takes-a-paragraph-types-mapping-by-name)                                             | `paragraphs_blokkli`      | low      | to verify  |
| F85  | [A rejected rewrite drops the token usage of its stream](#f85-a-rejected-rewrite-drops-the-token-usage-of-its-stream)                                                       | editor                    | low      | to verify  |
| F89  | [Building an edit state empties the fields of the cached entities](#f89-building-an-edit-state-empties-the-fields-of-the-cached-entities)                                   | `paragraphs_blokkli`      | low      | open       |
| F95  | [A refused batch of texts names one text, without its language](#f95-a-refused-batch-of-texts-names-one-text-without-its-language)                                          | both                      | low      | open       |
| F97  | [The edit extension still requires the entity query extension](#f97-the-edit-extension-still-requires-the-entity-query-extension)                                           | `paragraphs_blokkli`      | low      | to verify  |
| F102 | [The library search fails for an empty list of types](#f102-the-library-search-fails-for-an-empty-list-of-types)                                                            | `paragraphs_blokkli`      | low      | open       |
| F103 | [A preview misses a change that is made before its first poll](#f103-a-preview-misses-a-change-that-is-made-before-its-first-poll)                                          | editor                    | low      | open       |
| F104 | [A refused machine translation answers "Internal server error"](#f104-a-refused-machine-translation-answers-internal-server-error)                                          | `paragraphs_blokkli`      | low      | open       |
| F110 | [The Search API lists show what the index returns](#f110-the-search-api-lists-show-what-the-index-returns)                                                                  | `paragraphs_blokkli`      | low      | to verify  |
| F111 | [A new target resets the options of a link](#f111-a-new-target-resets-the-options-of-a-link)                                                                                | `paragraphs_blokkli`      | low      | to verify  |
| F112 | [A text update of a link field does nothing, and is stored](#f112-a-text-update-of-a-link-field-does-nothing-and-is-stored)                                                 | `paragraphs_blokkli`      | low      | open       |
| F113 | [The comment module's schema extension needs the GraphQL submodule](#f113-the-comment-modules-schema-extension-needs-the-graphql-submodule)                                 | `paragraphs_blokkli`      | low      | to verify  |
| F114 | [A date after 2038 can't be scheduled on MySQL](#f114-a-date-after-2038-cant-be-scheduled-on-mysql)                                                                         | `paragraphs_blokkli`      | low      | open       |
| F115 | [A violation of a host's paragraphs field names no entity](#f115-a-violation-of-a-hosts-paragraphs-field-names-no-entity)                                                   | `paragraphs_blokkli`      | low      | to verify  |
| F116 | [A comment can be edited or deleted through any page](#f116-a-comment-can-be-edited-or-deleted-through-any-page)                                                            | `paragraphs_blokkli`      | low      | open       |
| F117 | [An add or a move into a field that blökkli doesn't manage is lost](#f117-an-add-or-a-move-into-a-field-that-blökkli-doesnt-manage-is-lost)                                 | `paragraphs_blokkli`      | low      | to verify  |
| F120 | [A mutation from a text or form body runs as the user](#f120-a-mutation-from-a-text-or-form-body-runs-as-the-user)                                                          | `nuxt-graphql-middleware` | low      | workaround |
| F121 | [The library's query access finds unpublished items that its access handler hides](#f121-the-librarys-query-access-finds-unpublished-items-that-its-access-handler-hides)   | `paragraphs`              | low      | open       |

Statuses: `to verify` (read in the code, not reproduced), `open`, `workaround`
(the sandbox works around it), `parked` (part of a plan of its own, in
[README](README.md)'s "Features that need their own plan").

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
- **Depends on the site:** it takes translatable fields, the default. Scheduler
  defines both dates as translatable, core the status; a site can make each one
  shared in its content translation settings. The sandbox keeps the defaults.
  - All three shared: one value for every language, no F24.
  - All three per language: F24.
  - Dates shared, status per language: the date is set everywhere, but only the
    edit's language is hidden; the others are live before the date.
  - Status shared, dates per language: hidden everywhere, but only one language
    has the date; cron publishes all of them at that date.
  - Scheduler's cron handles each translation's dates on their own.
- **Fix idea:** a new version of `set_paragraph_schedule` that sets the dates
  and the status on every translation. That's right for shared fields as well,
  but rules out schedules per language, which the dialog can't set today either.
  Or schedules per language, with the language in the dialog.
- **Parked** (the user, 2026-10-14): part of the plan for publish status per
  language ([README](README.md), "Features that need their own plan"), with F26.
  Tests can use the Scheduler module since the fix of F23:
  `paragraphs_blokkli_scheduler_test` gives it the paragraphs, as the sandbox's
  patch does.

## F26: "Publish if unpublished" acts on the default translation

- **Found:** 2026-09-27, 13f. Reproduced 2026-10-12 over GraphQL, in sandboxes
  with English and with German as the original language.
- **Symptom:** a news item published in English and unpublished in German,
  published from the German editor with the mode "Publish": German stays
  unpublished. The other way round (English unpublished, German published),
  publishing from the German editor publishes English. English is the original
  language here; with German as the original, it shows from the English editor.
- **Cause:** publishing loads the host through `getHostEntity()`, which returns
  the original language (`src/Entity/ParagraphsBlokkliEditState.php:317-347` at
  `0f3e2e8`), and sets that one published
  (`src/ParagraphsBlokkliManager.php:323-325`). The publish dialog shows the
  status of the editor's language.
- **Impact:** an editor can't publish a translation from the editor, and may
  publish the original language by accident.
- **Decision (the user, 2026-10-12): no patch.** Publishing the editor's
  language, or a list of languages to tick in the dialog, would paper over what
  is missing: the editor has no notion of a publish status per language. That is
  a feature with a plan of its own, not started
  ([README](README.md#features-that-need-their-own-plan)).
- **What the feature must do:** show clearly that only some languages are
  published, whichever language the user is in.
- **The open UX problem:** the status sits next to the entity's title in the
  toolbar, the language switcher at the toolbar's other end. Showing the status
  with the language switcher is the obvious choice, but then the one at the
  title is in limbo: it changes with the language the user is in.
- **What exists today** (2026-10-12, read in the code):
  - The editor acts on one status, `state.entity.status`
    (`src/runtime/editor/features/publish/`). The Drupal adapter fills it with
    the status of the language being edited.
  - The state already has every translation's `exists` and `status`
    (`state.translation.value.translations`, `EntityTranslation` in
    `src/runtime/editor/types/state.ts`). Only `exists` is used, by the language
    switcher.
  - `publish()` sends one flag, `publishIfUnpublished`, without a language. A
    page that is published only has the mode "Publish", so the flag is sent on
    every publish: publishing every language on it would put a translation live
    that was held back on purpose.
  - The publish button is disabled without pending changes, so a language can't
    be published on its own without changing something.
  - The module creates a page's translation as a copy of the original
    (`addTranslation()` with its values), status included.
  - By a search: the scheduler submodule doesn't pass the flag, so a scheduled
    publish doesn't change the page's status.
- **Related:** F24 (a paragraph's schedule applies to one translation) and the
  sandbox's scheduler dates, which are translatable to match `status`.

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
- **Workaround:** the sandbox frontend redefines `bkVisibleLanguages` in
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

## F40: A new comment without a mention notifies nobody

- **Found:** 2026-09-28, 13h.
- **Symptom:** an editor comments on a page; the other people working on it
  aren't notified unless they're mentioned.
- **Cause:** the comment module only creates `comment:mention`, `comment:reply`,
  `comment:thread` and `comment:resolved`
  (`modules/paragraphs_blokkli_comment/src/CommentNotifier.php`).
- **Workaround:** mention the reviewer (the demo's flow, 13h).
- **Fix idea:** notify the edit state's owner of new comments on their page.

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
- **Test:** the mock suite's last spec checked that an approval links to the
  page without a `blokkliComment` param. It was deleted on 2026-10-10; recreate
  it in `test/e2e-drupal/features/notifications/` with the notification.

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

## F64: A template or a copy places a library item its user may not view

- **Found:** 2026-10-11, by reading, when `add_reusable` got its check of view
  access to the library item. Not reproduced.
- **Symptom:** `add_reusable` refuses a library item that its user may not view,
  e.g. an unpublished one. Two other ways place such an item:
  - A template that holds a `from_library` paragraph: `add_from_template` checks
    view access to the template, not to the library items in it.
  - Duplicating a `from_library` paragraph whose item was unpublished since: the
    copy repeats the reference.
  - Detaching such a paragraph (`detach_reusable`) goes further: the page gets a
    copy of the item's paragraph, so the user gets the content of an item that
    they may not view.
- **Cause:** the paragraphs come from `createParagraphFromSerializedData()`
  (`src/SerializedParagraphCreationTrait.php`, at `29a392b`) and from the
  duplicate, which set `field_reusable_paragraph` as it was. The field's allowed
  types are checked for the item's paragraph type
  (`getPlacedParagraphBundles()`), access to the item isn't.
- **Impact:** low. The user repeats a reference that exists already, and the
  page shows nothing in its place while the item is unpublished.
- **Fix idea:** when such a mutation is added, check view access to the library
  items of the placed paragraphs, next to the check of the allowed types. Or
  decide that repeating an existing reference needs no check, as for the nested
  paragraph types of a duplicated paragraph.

## F68: An old copy from another page gives its new paragraphs a new UUID on every replay

- **Found:** 2026-10-12, by reading. Its larger part is fixed since 2026-10-14:
  the copy of a nested paragraph that the first run didn't see gets the same
  UUID on every replay, made of the UUIDs of its paragraph's copy and of the
  nested paragraph (`DuplicateMutationBase::getUuidForNestedCopy()`). That
  covers `duplicate`, `duplicate_multiple`, and the nested paragraphs in the
  copies of `copy_from_existing` and `detach_reusable` that were stored before
  their version 3.
- **Symptom:** a `copy_from_existing` that was stored before its version 3
  copies what the other page holds on every run. A paragraph that the other page
  got since, at the top of a copied field, gets a new UUID on every replay: a
  later mutation that names it no longer finds it. The same for a
  `detach_reusable` stored before its version 3, when the library item holds
  another paragraph since.
- **Cause:** `getUuidForNewEntity()` (`src/ParagraphsBlokkliPluginTrait.php` at
  `f24e0a0`) makes a random UUID for a paragraph that the first run didn't
  store. Such a paragraph has no copy of a paragraph above it to make its UUID
  of.
- **Impact:** low: only mutations stored before version 3 of the two.
- **Fix idea:** none yet. A UUID made of the host's and the paragraph's would be
  the same for two such mutations that copy from the same page.

## F70: A library item shares its paragraph with the page's earlier revisions

- **Found:** 2026-10-12, fixing the former F12. Its larger part is fixed: "Add
  to library" changed the page's earlier revisions, and deleting the library
  item emptied them. A paragraph that gets a new host now gets a new revision:
  the same happened to one that was moved into a new paragraph.
- **Symptom:** "Add to library" moves the paragraph into the new library item.
  The library item references a new revision of it, the page's earlier revisions
  the ones before: one paragraph, with one UUID, in two places.
  - Reverting the page to an earlier revision makes a further revision for the
    page. The paragraph's default revision and its parent are then the page's,
    until the library item is saved again. Reproduced before the fix.
  - By reading: after the library item is deleted, its revision of the paragraph
    stays behind without a parent. The cleanup of orphaned paragraphs never
    deletes a default revision that has others next to it.
- **Cause:** `MakeReusable::execute()`
  (`src/Plugin/ParagraphsBlokkli/Mutation/MakeReusable.php:102-108` at
  `0afa03d`) puts the paragraph itself into the library item. Paragraphs' own
  "Promote to library" (`LibraryItem::createFromParagraph()`) puts a duplicate
  into it.
- **Impact:** low: each place shows its own revision.
- **Fix idea:** a new version of `make_reusable` that puts a duplicate into the
  library item, with stored UUIDs (`duplicateParagraph()` of the helper and
  `DuplicateMutationBase::duplicateChildren()`). The original and its nested
  paragraphs leave the edit state. Stored mutations keep moving the paragraph.
  By reading (a review of the plan), the duplicate must also:
  - keep the published state, per translation: `duplicateParagraph()` of the
    helper with `withStatus`;
  - cope with nested paragraphs that the first run didn't see:
    `duplicateChildren()` does.

## F71: Moving a paragraph into its own nested paragraph is refused for the wrong reason

- **Found:** 2026-10-12, trying the nesting limit in a sandbox, over GraphQL.
- **Symptom:** `move` of a section into a section that is nested in it is
  refused with "Paragraphs can't be nested more than 7 levels deep.", at any
  depth. The refusal is right, the reason isn't: the paragraphs would hold each
  other, and the limit's check counts that as too deep.
- **By reading:** before the limit (2026-10-12) the move was accepted. The
  paragraph and everything nested in it then had no way back to the page: gone
  from the editor, and from the page when it was published. `Move::execute()`
  and `MoveMultiple::execute()` have no check of their own. The editor doesn't
  offer such a drop.
- **Impact:** low. Only a client that sends the mutation itself gets there, and
  it is refused.
- **Fix idea:** refuse it in `move` and `move_multiple` when the mutation is
  added, with a message of its own. A kernel test.

## F72: The editor offers places below the nesting limit

- **Found:** 2026-10-12, by reading, when Drupal got its limit of 7 levels
  (`ParagraphsBlokkliHelper::MAX_NESTING_LEVEL`).
- **Symptom:** the editor knows no limit. In a container on level 7 it shows the
  places to add or drop a paragraph, and so for a container that is dragged to
  where its nested paragraphs would end below level 7. Drupal refuses the
  mutation; the editor shows its message: "Paragraphs can't be nested more than
  7 levels deep."
- **Impact:** low: a refusal with a clear message, and only that deep.
- **Fix idea:** the adapter tells the editor the limit, and the editor leaves
  out fields on that level, and places where the dragged paragraphs wouldn't fit
  (`state.getNestingLevel()` knows the level of each paragraph).

## F73: A new paragraph of a type its field doesn't allow is no violation

- **Found:** 2026-10-12, with a kernel test, when the edit state got validated
  as it's edited (the former F53).
- **Symptom:** a stored `add` puts a text into a grid that only takes buttons.
  While editing, validation finds nothing. A saved text that a stored `move`
  puts there has its violation (`field_items.0.target_id`).
- **By reading:** publishing validates the same way, so it finds nothing either.
  Once published, the paragraph is saved, and the next edit state shows the
  violation.
- **Cause:** Paragraphs 8.x-1.23,
  `ParagraphSelection::validateReferenceableNewEntities()`
  (`src/Plugin/EntityReferenceSelection/ParagraphSelection.php:251-259`). Its
  closure doesn't `use ($bundles)`, so `isset($bundles)` is false in it and
  every new paragraph counts as allowed.
- **Impact:** low. A mutation is refused when it's added, so only a stored one
  gets there: one from before that check, or from before the field's settings
  changed.
- **Fix idea:** a patch for Paragraphs (`use ($bundles)`). Whether drupal.org
  has an issue for it isn't looked up yet.

## F74: The older mutations for media leave a link field empty

- **Found:** 2026-10-12, with a kernel test, while checking which mutations
  besides `replace_media` (the former F45) can't set a link field.
- **Symptom:** with an entity mapping from the media type to a link field (as
  the sandbox has for documents), `add_media_image_reference` and
  `add_media_video_reference` add the paragraph with an empty link. Nothing is
  reported.
- **By reading:** `add_video_remote` sets its field the same way.
- **Cause:** they set `['target_id' => …]` on the mapped field
  (`Mutation/AddMediaImageReference.php:168`,
  `Mutation/AddMediaVideoReference.php:168`, `Mutation/AddVideoRemote.php:179`
  at `0f3e2e8`), which a link item ignores. The other mutations that fill a
  mapped field use `getLinkOrEntityReferenceFieldValue()`.
- **Impact:** low. The Drupal adapter uses only `add_video_remote`, for a pasted
  video URL, and the sandbox maps remote videos to a reference field. The other
  two are for older clients.
- **Fix idea:** `getLinkOrEntityReferenceFieldValue()` behind a mutation
  version, since stored ones replay with the empty link. Or refuse a mapping to
  a link field when the mutation is added.

## F76: A search result replaces the first mapped field

- **Found:** 2026-10-12, by reading, in the same check. Not reproduced: no
  paragraph type of the sandbox has two such fields.
- **Symptom:** a paragraph type has two fields that entity mappings allow the
  same bundle for. A search result dropped on the second one ("Replace …")
  replaces the first.
- **Cause:** the Drupal adapter's `replaceContentSearchItem`
  (`src/modules/drupal/runtime/adapter/index.ts:2041-2050`, in this repository)
  doesn't send the field's name, although `pbReplaceEntityReference` has the
  variable. `replace_entity_reference` then takes the bundle's first mapping for
  the paragraph type (`PbEntityMapping::getMappingForBundle()`). The agent's
  `replace_content_search_item` tool goes through the same method.
- **Fix idea:** send `fieldName: data.host.fieldName`.

## F77: "Add to" is offered for link fields with several values

- **Found:** 2026-10-12, by reading, in the same check. Not reproduced: the
  sandbox has no link field with several values.
- **Symptom:** a media dragged from the library over a link field with several
  values, which an entity mapping allows its type for, gets the place "Add to
  …". The drop fails: "Field '…' is not a droppable reference field."
- **Cause:** the drop areas of the editor's `droppable-field-edit` feature
  (`src/runtime/editor/features/droppable-field-edit/index.vue:178-250`, in this
  repository) don't look at the field's type, as its command (`:103`) and
  `droppable:open` (`:146`) do. `update_droppable_field` only takes reference
  fields, which `UpdateDroppableFieldTest` pins.
- **Fix idea:** leave out fields whose `config.type` isn't `reference`.

## F78: A page's link field takes a paragraph type's mapping by name

- **Found:** 2026-10-12, by reading, in the same check. Not reproduced.
- **Symptom:** a content type has the machine name of a paragraph type, and a
  link field of the same name as that type's (say both `event`, with
  `field_link`). The page's link field is then listed with the entities that the
  paragraph type's mappings allow. For media, the editor offers "Replace …" on
  it, and `replace_host_entity_media` refuses: it only takes reference fields,
  since no mapping can name a field of a page.
- **Cause:** `ParagraphsBlokkliDroppableFieldConfig::getDroppableFields()`
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/ParagraphsBlokkliDroppableFieldConfig.php:117-133`
  at `0f3e2e8`) compares a mapping's paragraph type and field with the bundle
  and the field's name, also for the host's bundle.
- **Fix idea:** look at the mappings only for fields of paragraphs.

## F85: A rejected rewrite drops the token usage of its stream

- **Found:** 2026-10-12, by reading, when the agent's text tools got their error
  for a batch that the backend rejects (the former F83). Not reproduced.
- **Symptom:** `delegate_text_rewrite` streams its texts from the model, and
  reports the tokens of that stream with its result. When the backend rejects
  the texts, the tool ends with an error, and the tokens aren't counted.
- **Cause:** `emitFailure()`
  (`src/modules/agent/runtime/app/tools/delegate_text_rewrite/Component.vue:110`)
  emits the error without `_usage`, and the error of a `ToolOutcome` has no
  `meta` to carry it (`executeComponentTool()`,
  `providers/toolsProvider.ts:151`).
- **Impact:** low: the usage of one stream, on a path that is rare.
- **Fix idea:** give the failed outcome its `meta`.
- **Also open:** the rejection in `delegate_text_rewrite` has no spec of its
  own. It shares `applyFieldDiffs()` with `update_text_fields`, whose spec
  covers it.

## F89: Building an edit state empties the fields of the cached entities

- **Found:** 2026-10-12, in a kernel test for the validation of nested
  paragraphs (the former F81): a grid that was loaded and saved after the edit
  state was built lost its paragraphs.
- **Symptom:** after an edit state is built for editing, the page and its nested
  paragraphs are in Drupal's entity cache with empty paragraphs fields. Code
  that loads one of them later in the same request gets it without its
  paragraphs, and stores it that way when it saves it.
- **Cause:** `ParagraphsBlokkliEditState::executeMutations()`
  (`src/Entity/ParagraphsBlokkliEditState.php:472-490` at `4b5c6e7`) empties the
  fields on the objects that it loaded, which are the cached ones. The module's
  tests clear the cache for that reason
  (`ParagraphsBlokkliTestTrait::paragraphsBlokkliPublish()`).
- **Impact:** low: nothing in the module saves these entities in such a request.
  A hook of a site could.
- **Fix idea:** build the state on clones, or put the fields back after the
  mutated state is built.

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
