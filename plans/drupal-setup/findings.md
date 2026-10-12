# Findings: upstream bugs

Bugs found while building the sandbox that belong in other projects, mostly
`paragraphs_blokkli`. They're tracked here and fixed separately. A fixed one is
removed; its commit names it.

Code references are relative to the `paragraphs_blokkli` repository at `32bbcfe`
(2.0.x), unless noted otherwise.

| #   | Finding                                                                                                                                                                   | Project              | Severity | Status     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------- | ---------- |
| F5  | [Twig 3.30 breaks escaping](#f5-twig-330-breaks-escaping)                                                                                                                 | Drupal core          | high     | workaround |
| F6  | [Starterkit nginx routing](#f6-starterkit-nginx-routing)                                                                                                                  | `blokkli_starterkit` | low      | open       |
| F9  | [Link titles from entity mappings](#f9-link-titles-from-entity-mappings)                                                                                                  | `paragraphs_blokkli` | medium   | workaround |
| F11 | [Options schema: no validation, lossy form saves](#f11-options-schema-no-validation-lossy-form-saves)                                                                     | `paragraphs_blokkli` | low      | open       |
| F14 | [The comment filter leaks into new text formats](#f14-the-comment-filter-leaks-into-new-text-formats)                                                                     | `paragraphs_blokkli` | low      | open       |
| F18 | [Links to library items and templates](#f18-links-to-library-items-and-templates)                                                                                         | both                 | low      | workaround |
| F19 | [Template and library search](#f19-template-and-library-search)                                                                                                           | both                 | low      | open       |
| F20 | [Default templates with `add_multiple`](#f20-default-templates-with-add_multiple)                                                                                         | `paragraphs_blokkli` | low      | open       |
| F23 | [A past unpublish date blocks publishing](#f23-a-past-unpublish-date-blocks-publishing)                                                                                   | both                 | low      | open       |
| F24 | [Paragraph schedules apply to one translation](#f24-paragraph-schedules-apply-to-one-translation)                                                                         | `paragraphs_blokkli` | medium   | open       |
| F25 | [An empty change description keeps the old log](#f25-an-empty-change-description-keeps-the-old-log)                                                                       | `paragraphs_blokkli` | low      | open       |
| F26 | ["Publish if unpublished" acts on the default translation](#f26-publish-if-unpublished-acts-on-the-default-translation)                                                   | both                 | medium   | parked     |
| F28 | [Labels that can't be translated](#f28-labels-that-cant-be-translated)                                                                                                    | `@blokkli/editor`    | low      | workaround |
| F29 | [Drops write only the source's link](#f29-drops-write-only-the-sources-link)                                                                                              | `paragraphs_blokkli` | low      | workaround |
| F30 | [No hint for shared fields in a translation](#f30-no-hint-for-shared-fields-in-a-translation)                                                                             | `paragraphs_blokkli` | low      | open       |
| F32 | [Content search results in the source language](#f32-content-search-results-in-the-source-language)                                                                       | `paragraphs_blokkli` | medium   | open       |
| F33 | [Transform plugins don't get the language](#f33-transform-plugins-dont-get-the-language)                                                                                  | both                 | low      | workaround |
| F35 | [A data source's colour overrides apply to one language](#f35-a-data-sources-colour-overrides-apply-to-one-language)                                                      | `@blokkli/editor`    | low      | open       |
| F40 | [A new comment without a mention notifies nobody](#f40-a-new-comment-without-a-mention-notifies-nobody)                                                                   | `paragraphs_blokkli` | low      | open       |
| F41 | [Every comment is marked as edited](#f41-every-comment-is-marked-as-edited)                                                                                               | `paragraphs_blokkli` | low      | open       |
| F43 | [Translators can't be limited to translating](#f43-translators-cant-be-limited-to-translating)                                                                            | both                 | low      | open       |
| F44 | [No approval step](#f44-no-approval-step)                                                                                                                                 | both                 | low      | open       |
| F46 | [A pasted URL can't become a link](#f46-a-pasted-url-cant-become-a-link)                                                                                                  | both                 | low      | open       |
| F48 | [A preview grant opens more than the preview](#f48-a-preview-grant-opens-more-than-the-preview)                                                                           | `paragraphs_blokkli` | low      | open       |
| F50 | [Any GraphQL user can create text keys](#f50-any-graphql-user-can-create-text-keys)                                                                                       | `texts`              | low      | open       |
| F52 | [A comment's label throws](#f52-a-comments-label-throws)                                                                                                                  | `paragraphs_blokkli` | low      | open       |
| F62 | [An edit state shows the latest revision without revision access](#f62-an-edit-state-shows-the-latest-revision-without-revision-access)                                   | `paragraphs_blokkli` | low      | to verify  |
| F63 | [A stored conversion follows the current field settings](#f63-a-stored-conversion-follows-the-current-field-settings)                                                     | `paragraphs_blokkli` | low      | open       |
| F64 | [A template or a copy places a library item its user may not view](#f64-a-template-or-a-copy-places-a-library-item-its-user-may-not-view)                                 | `paragraphs_blokkli` | low      | to verify  |
| F67 | [A deleted library item fails the edit states that placed it](#f67-a-deleted-library-item-fails-the-edit-states-that-placed-it)                                           | `paragraphs_blokkli` | low      | open       |
| F68 | [A stored copy from another page follows that page](#f68-a-stored-copy-from-another-page-follows-that-page)                                                               | `paragraphs_blokkli` | low      | to verify  |
| F69 | [A detach right after "Add to library" copies the published nested paragraphs](#f69-a-detach-right-after-add-to-library-copies-the-published-nested-paragraphs)           | `paragraphs_blokkli` | low      | open       |
| F70 | ["Add to library" changes the page's earlier revisions](#f70-add-to-library-changes-the-pages-earlier-revisions)                                                          | `paragraphs_blokkli` | low      | open       |
| F71 | [Moving a paragraph into its own nested paragraph is refused for the wrong reason](#f71-moving-a-paragraph-into-its-own-nested-paragraph-is-refused-for-the-wrong-reason) | `paragraphs_blokkli` | low      | open       |
| F72 | [The editor offers places below the nesting limit](#f72-the-editor-offers-places-below-the-nesting-limit)                                                                 | editor               | low      | open       |
| F73 | [A new paragraph of a type its field doesn't allow is no violation](#f73-a-new-paragraph-of-a-type-its-field-doesnt-allow-is-no-violation)                                | `paragraphs`         | low      | open       |
| F74 | [The older mutations for media leave a link field empty](#f74-the-older-mutations-for-media-leave-a-link-field-empty)                                                     | `paragraphs_blokkli` | low      | open       |
| F76 | [A search result replaces the first mapped field](#f76-a-search-result-replaces-the-first-mapped-field)                                                                   | editor               | low      | to verify  |
| F77 | ["Add to" is offered for link fields with several values](#f77-add-to-is-offered-for-link-fields-with-several-values)                                                     | editor               | low      | to verify  |
| F78 | [A page's link field takes a paragraph type's mapping by name](#f78-a-pages-link-field-takes-a-paragraph-types-mapping-by-name)                                           | `paragraphs_blokkli` | low      | to verify  |
| F80 | [A copy from another page takes no access to it](#f80-a-copy-from-another-page-takes-no-access-to-it)                                                                     | `paragraphs_blokkli` | low      | to verify  |
| F85 | [A rejected rewrite drops the token usage of its stream](#f85-a-rejected-rewrite-drops-the-token-usage-of-its-stream)                                                     | editor               | low      | to verify  |
| F88 | [The form of a paragraph hides a link that its user may not open](#f88-the-form-of-a-paragraph-hides-a-link-that-its-user-may-not-open)                                   | `paragraphs_blokkli` | low      | to verify  |
| F89 | [Building an edit state empties the fields of the cached entities](#f89-building-an-edit-state-empties-the-fields-of-the-cached-entities)                                 | `paragraphs_blokkli` | low      | open       |
| F90 | [The list of referenced entities names what its user may not view](#f90-the-list-of-referenced-entities-names-what-its-user-may-not-view)                                 | `paragraphs_blokkli` | low      | to verify  |
| F95 | [A refused batch of texts names one text, without its language](#f95-a-refused-batch-of-texts-names-one-text-without-its-language)                                        | both                 | low      | open       |
| F96 | [The editor reads field values through a detached element](#f96-the-editor-reads-field-values-through-a-detached-element)                                                 | editor               | low      | to verify  |
| F97 | [The edit extension still requires the entity query extension](#f97-the-edit-extension-still-requires-the-entity-query-extension)                                         | `paragraphs_blokkli` | low      | to verify  |

Statuses: `to verify` (read in the code, not reproduced), `open`, `workaround`
(the sandbox works around it).

## F5: Twig 3.30 breaks escaping

- **Found:** 2026-09-26, SQLite spike, with Drupal 11.4.7.
- **Symptom:** every template that escapes output throws
  "EscaperRuntime::escape(): Argument #4 ($autoescape) must be of type bool,
  null given". Pages return 500.
- **Cause:** core requires `twig/twig: ^3.28.0`, and `core-recommended` 11.4.7
  doesn't pin Twig, so a fresh install gets 3.30.0. Twig 3.30 compiles `|escape`
  to `$this->escaper->escape(...)`, but with the argument list of Drupal's own
  escape filter.
- **Workaround in the sandbox:** pin `twig/twig` to `~3.29.0` (chunk 03).
- **To do:** check whether core has an issue for it, and remove the pin once a
  core release fixes it.

## F6: Starterkit nginx routing

- **Found:** 2026-09-26, while porting the starterkit's nginx config for
  chunk 02. Code references are relative to the `blokkli_starterkit` repository
  (2.0.x, `.ddev/nginx_full/`, generated from `scripts/nginx-conf-generator/`).
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
  - **PHP in the files directories.** The PHP location matches any `*.php`, and
    only `\..*/.*\.php$` is denied, so a `.php` file under `sites/*/files` is
    passed to PHP. Drupal's nginx recipe denies it (found 2026-10-06, chunk 10).
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
  - `location ~ ^/sites/[^/]+/files/.*\.php$ { deny all; }` before the other
    locations of files, as in this repo since chunk 10.

## F9: Link titles from entity mappings

- **Found:** 2026-09-26, while building the content model in chunk 04, by
  reading the code.
- **Wrong title.** When a mapping targets a link field with a title,
  `LinkOrReferenceFieldTrait::getLinkOrEntityReferenceFieldValue()`
  (`src/Traits/LinkOrReferenceFieldTrait.php:64`) sets the title to
  `$entity->label()`: the paragraph, not the target entity.
  - For a new paragraph that's "Orphaned Button: …". Affected: `add_file`,
    `add_entity_reference`, `add_entity_reference_multiple`.
  - `replace_entity_reference` overwrites a title the user wrote. So does
    `replace_media` on a link field, which it takes since 2026-10-12 (the former
    F45).
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

## F11: Options schema: no validation, lossy form saves

- **Found:** 2026-09-26, planning chunk 13b.
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
  is uninstalled. `basic_html` has it too since chunk 10 changed it.
- **Fix idea:** make the plugin's configuration match its defaults (e.g.
  `defaultConfiguration()` or `setConfiguration()` in the plugin).

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
    (`sandbox/frontend/app/pages/[lang]/blokkli/library-item/[uuid].vue`, and
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
- **The template search checks no access** (2026-10-11):
  `EntityQueryTemplates::getTemplatesSearchResults()` selects from the database
  and loads every template, for every user of the editor. Without
  `view paragraph templates`, the dialog lists templates whose previews stay
  empty, and inserting one is refused since `add_from_template` checks the
  permission. It doesn't leave out templates with paragraph types that the user
  may not create either.

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
- **Also** (by reading):
  - The template root's own options aren't applied
    (`createAndAddParagraphWithTemplate` sets no behavior settings), only its
    children's.
  - The template's nested paragraph types aren't checked against the user's
    `create` permissions (`AddMutationBase::createNestedParagraphs()`, at
    `29a392b`): a user who may add columns gets the texts of the default
    template without `create` for texts. Left as it is on 2026-10-11, when
    `add_from_template` got that check: the default template is what the site
    defines as a new paragraph of the type. To decide.
- **Fix idea:** skip the template's children for a field that gets children.

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
- **Since 2026-10-12** the edit state validates nested paragraphs too, so a
  nested paragraph with a past date blocks the publishing as well.
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

## F41: Every comment is marked as edited

- **Found:** 2026-09-28, 13h.
- **Symptom:** every comment and reply shows "(edited)" in the editor, right
  after it was posted.
- **Cause:** the GraphQL field `updated` returns the `changed` time whenever it
  exists, and it's set on every save
  (`modules/paragraphs_blokkli_comment/src/Plugin/GraphQL/SchemaExtension/ParagraphsBlokkliCommentExtension.php:174-180`).
- **Fix idea:** return `NULL` while `changed` equals `created`.

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

## F48: A preview grant opens more than the preview

- **Found:** 2026-10-06, chunk 10, by reading the code.
- **Symptom:** a session with a preview grant passes
  `paragraphs_blokkli_can_use_blokkli`. That also gates search, the library,
  transforms, templates, comments and DeepL's translation request
  (`modules/paragraphs_blokkli_deepl/src/Plugin/GraphQL/SchemaExtension/DeeplExtension.php:44-52`).
  Since chunk 10, anonymous visitors with a preview link can request
  translations from DeepL.
- **Checked:** mutations of the edit state are refused (they need update access
  to it).
- **Fix idea:** gate DeepL, and anything else that writes or costs, with the
  edit permission.

## F50: Any GraphQL user can create text keys

- **Found:** 2026-09-27, 13f.
- **Symptom:** the texts resolvers create a text for every unknown key, without
  an access check (`TextsTranslator::trans()`, `src/TextsTranslator.php:117` in
  `texts`). Any user with GraphQL access can fill the table:
  - in a sandbox, its users;
  - since chunk 10, anonymous visitors with a preview grant;
  - on the dev site, everyone, with `blokkli_playground_public`.
- **Fix idea:** create keys only with a permission, or only in development.

## F52: A comment's label throws

- **Found:** 2026-10-06, 09c, with a drush script that printed a seeded
  comment's label.
- **Symptom:** `BlokkliComment::label()` calls `$this->t()`, but the entity
  doesn't use `StringTranslationTrait`
  (`modules/paragraphs_blokkli_comment/src/Entity/BlokkliComment.php:78` at
  `b00b2d7`). Anything that asks a comment for its label fails with "Call to
  undefined method BlokkliComment::t()": e.g. an entity reference to a comment,
  or a log message with the label.
- **Fix idea:** `use StringTranslationTrait;` in the entity, or
  `new TranslatableMarkup()`.

## F62: An edit state shows the latest revision without revision access

- **Found:** 2026-10-10, reading the code while letting reviewers open entities
  without an edit state (not reproduced: the sandbox has no such revisions).
- **Symptom:** whoever may view edit states sees the host entity's latest
  revision in the editor, even one they couldn't view otherwise, e.g. a content
  moderation draft without "View latest version". With the read-only edit state
  for reviewers, that's every entity with blökkli they can view, not only the
  ones someone has edited.
- **Cause:** `ParagraphsBlokkliEditState::getHostEntity()` loads the latest
  revision, while `LoadHostEntity::resolve()`
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/LoadHostEntity.php`)
  checks view access on the default revision only.
- **Fix idea:** when the latest revision isn't the default one, check access to
  it (`view revision`, or content moderation's latest version access); without
  it, use the default revision.

## F63: A stored conversion follows the current field settings

- **Found:** 2026-10-11, reading the conversions for the allowed types (the
  former F16); reproduced with a throwaway kernel test.
- **Symptom:** a conversion that was stored with its nested paragraphs loses
  them later. A grid with a button was converted into a list whose field allows
  every type: the list had the button. After the list's field was narrowed to
  another type, the same edit state replayed the conversion without the button.
  Nothing reports it. By reading: publishing then saves the list without it, and
  the other way round, a nested paragraph that was dropped comes back.
- **Cause:** `ConvertMutationBase::convertParagraph()`
  (`modules/paragraphs_blokkli_conversion/src/Plugin/ConvertMutationBase.php:164-179`
  at `29a392b`) asks on every run which types the target field allows, and marks
  a nested paragraph that doesn't fit as deleted. Other decisions that depend on
  the site's settings (validation, text formats, templates, allowed types) are
  made on the first run, and stored where a replay needs them.
- **Impact:** only with a change of a field's allowed types while an edit state
  with such a conversion is pending, e.g. a deployment. Later mutations of the
  same edit state that change a dropped paragraph then act on a deleted one (by
  reading).
- **Fix idea:** decide on the first run which nested paragraphs move to which
  field, store that in the mutation's configuration, and replay it. Stored
  conversions without it keep today's behaviour.

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

## F67: A deleted library item fails the edit states that placed it

- **Found:** 2026-10-12, in the sandbox check of the detach fix.
- **Symptom:** an edit state places a library item (`add_reusable`) and isn't
  published. Then the item is deleted. From then on the placement fails on every
  replay with "Missing Entity", and what was done with the placed paragraph
  since is lost with it. That includes a detach: since 2026-10-12 it stores its
  copy, but the paragraph that the copy replaces isn't there.
- **Not affected:** a paragraph that was placed and published before it's
  detached. Its copy stays on the page when the item is changed or deleted.
- **Cause:** `AddReusable::execute()`
  (`src/Plugin/ParagraphsBlokkli/Mutation/AddReusable.php:72-83` at `b4f9c16`)
  looks the item up on every run, and throws when it's gone.
- **Impact:** low. The replay reports the error, and placing a library item to
  detach it at once is one way to get there.
- **Fix idea:** a detach stores where its paragraph was (host, field, the
  paragraph before it) with the copy, and adds the copy there when the paragraph
  is missing. Or decide that a failed placement fails what follows.

## F68: A stored copy from another page follows that page

- **Found:** 2026-10-12, by reading, when `detach_reusable` got its stored copy.
  Not reproduced.
- **Symptom:** an edit state copies the paragraphs of another page
  (`copy_from_existing`) and isn't published. If the other page changes before
  it is, the copied paragraphs change with it: new texts, added paragraphs, and
  removed ones are gone, with what was changed on them since.
- **Cause:** `CopyFromExisting::execute()`
  (`src/Plugin/ParagraphsBlokkli/Mutation/CopyFromExisting.php:52-128` at
  `b4f9c16`) loads the source entity and duplicates its paragraphs on every run.
  Only the paragraph types that the user may not create are stored.
- **Fix idea:** store what was copied when the mutation is added, as
  `detach_reusable` does since version 3
  (`ParagraphsBlokkliHelper::getDuplicateData()`), and replay from it. Stored
  mutations without it keep today's behaviour.
- **Also the deeper levels:** since 2026-10-12 paragraphs are loaded 7 levels
  deep instead of 5, so a stored copy now also brings the source's levels 6
  and 7. By reading: these copies have no stored UUID, so they get a new one on
  every replay until the edit state is published.

## F69: A detach right after "Add to library" copies the published nested paragraphs

- **Found:** 2026-10-12, fixing "Add to library" on a paragraph with nested
  paragraphs (the former F12); reproduced with a throwaway kernel test.
- **Symptom:** a grid is published with the buttons "one" and "two". In one edit
  state it gets a button "three" and loses "two", is added to the library, and
  is detached again. The copy holds "one" and "two": the nested paragraphs that
  were published last. That's what the editor shows, and what is published.
- **Not affected:** the library item itself. Without the detach, it holds "one"
  and "three", in the editor and when it's published.
- **Cause:** `DetachReusable` stores its copy when the mutation is added
  (`getCopyData()`,
  `src/Plugin/ParagraphsBlokkli/Mutation/DetachReusable.php:70` at `0afa03d`),
  from the fields of the item's paragraph. While the mutations run, those still
  hold what the paragraph was loaded with:
  `ParagraphsBlokkliEditState::rebuildNewLibraryItems()` fills them from the
  proxies after the last mutation.
- **Also:** the proxies of the nested paragraphs stay behind, with the paragraph
  that went into the library item as their host. Nothing saves them.
- **Impact:** low. It takes "Add to library" and "Detach from library" on the
  same paragraph in one edit state, and changes to its nested paragraphs before
  both.
- **Fix idea:** fill the fields of the item's paragraph from the proxies before
  the copy is taken. The rebuild is a method of the edit state today; a mutation
  can't call it.

## F70: "Add to library" changes the page's earlier revisions

- **Found:** 2026-10-12, fixing the former F12; reproduced with a throwaway
  kernel test. The revert is by reading.
- **Symptom:** a page is published with a grid that has two buttons. A third
  button is added, the grid is added to the library, and the page is published.
  The page's earlier revision now shows the grid with three buttons. The grid
  has one revision, and its parent is the library item.
- **By reading:** reverting the page to such a revision puts the library item's
  paragraph into the page's field too: one paragraph with two hosts.
- **Cause:** `MakeReusable::execute()`
  (`src/Plugin/ParagraphsBlokkli/Mutation/MakeReusable.php:102-108` at
  `0afa03d`) puts the paragraph itself into the new library item. The item is
  new, so entity_reference_revisions saves the paragraph without a new revision:
  the revision that the page's earlier revisions reference is changed in place.
  Paragraphs' own "Promote to library" (`LibraryItem::createFromParagraph()`)
  puts a duplicate into the item.
- **Impact:** low. Only earlier revisions change, and only to what the page had
  when "Add to library" was published. Later changes to the library item get new
  revisions.
- **Fix idea:** a new version of `make_reusable` that puts a duplicate into the
  library item, with stored UUIDs, as `detach_reusable` makes its copy. Stored
  mutations keep moving the paragraph.

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

## F80: A copy from another page takes no access to it

- **Found:** 2026-10-12, by reading, in the same check. Not reproduced.
- **Symptom:** `copy_from_existing` copies the paragraphs of any entity of the
  host's type and bundle whose UUID the request names, also of one that the user
  may not view, such as an unpublished page of somebody else.
- **Cause:** `CopyFromExisting::execute()`
  (`src/Plugin/ParagraphsBlokkli/Mutation/CopyFromExisting.php:48-128` at
  `e2523c5`) loads the source by its UUID and checks its bundle, and create
  access to the paragraph types. It doesn't check access to the source.
- **Impact:** low: the UUID of the page must be known.
- **Fix idea:** view access to the source when the mutation is added.

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

## F88: The form of a paragraph hides a link that its user may not open

- **Found:** 2026-10-12, in a screenshot while fixing the links to media (the
  former F82): as Anna Keller, the form of a link to a document showed "Link"
  empty.
- **Symptom:** the form of a paragraph shows a link field without its target
  when the user may not access the page of the target: a page that they may not
  view, or a media that no entity mapping allows in that field. By reading, not
  reproduced: a required field then refuses the form, as the sandbox's would,
  and one that isn't required is saved empty: the link is gone.
- **Cause:** Drupal's link widget (`LinkWidget::formElement()`,
  `core/modules/link/src/Plugin/Field/FieldWidget/LinkWidget.php:218-221`)
  leaves the default value out for a user who may neither `link to any page` nor
  access the link. `EditParagraphForm` stores the fields that the form changed,
  and an emptied link is a change.
- **Fixed for** the links that an entity mapping allows and whose target the
  user may view: `ParagraphsBlokkliFormBase::showAllowedEntityLinks()` shows
  them.
- **Impact:** low: the page forms of Drupal do the same.
- **Fix idea:** leave a link field out of the stored changes when the form
  didn't show its value, or disable it in the form with a hint.

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

## F90: The list of referenced entities names what its user may not view

- **Found:** 2026-10-12, by reading, while checking which forms of a link the
  rule for links to media reads (the former F82). Not reproduced.
- **Symptom:** the editor's list of the entities that a page references gets the
  label and the type of every entity behind a reference or a link, also of one
  that the user may not view. A link is read loosely there: `entity:media/7` and
  `internal:/media/7` both name media 7. With Drupal's default media settings
  `/media/7` leads nowhere, and Drupal accepts such a path for anyone without a
  check, so an editor can write it for any ID and read the label.
- **Cause:** `ReferencedEntities::loadEntityFromUri()` and `addEntity()`
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/ReferencedEntities.php:163-228`
  at `4b5c6e7`) load the entity from what follows the scheme, and add it without
  asking for view access.
- **Impact:** low: labels, for someone who may edit the page.
- **Fix idea:** view access before an entity is added. And one way to read the
  entity that a link names, for this list and for
  `ParagraphsBlokkliHelper::isAllowedEntityLink()`, which reads `entity:` only.

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

## F96: The editor reads field values through a detached element

- **Found:** 2026-10-12, by reading, when a violation's message had to become
  plain text. Not reproduced.
- **Symptom:** none seen. By reading: a browser loads the images of markup that
  is assigned to an element's `innerHTML`, attached to the page or not, and runs
  their `onerror`. A field value with such an image would run its script for
  whoever opens the dialog that reads it.
- **Cause:** `stripHtml()` in the translate dialog
  (`src/runtime/editor/features/translations/TranslateDialog/index.vue`) turns
  the source texts and the current translations into plain text that way. Others
  to look at: `src/runtime/editor/helpers/diff/index.ts` (two places) and the
  clipboard feature's `index.vue`. The values are what Drupal stores, before any
  text format filters them.
- **Impact:** low, to verify: it takes an editor who writes such a value with a
  request made by hand (the text editors don't produce one), and a site whose
  content security policy allows inline handlers.
- **Fix idea:** parse with `DOMParser`, whose document is inert, as
  `getViolationText()` does
  (`src/runtime/editor/features/translations/violations.ts`).

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
