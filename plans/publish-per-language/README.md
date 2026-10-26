# Publishing per language

What the editor publishes and schedules, and in which languages, and how the
user sees it. The work is done (2026-10-26). It began as two findings of the
drupal-setup plan, F24 (a paragraph's schedule) and F26 ("Publish if
unpublished"), which moved here on 2026-10-25.

Code references are relative to the `paragraphs_blokkli` repository at `3d34722`
(2.0.x), except those under `src/runtime/` and `src/modules/`, which are in this
repository.

## The problem

The user can't see what "Publish" and "Manage schedule" act on:

1. **The changes.** One edit state covers every language. Publishing it saves
   the changes in all of them at once, even when the user only worked in one.
   The dialog doesn't say so.
2. **The status and the schedules.** Depending on the site's settings, they act
   on one language or on all of them. For the page, the one language is the
   original, not the one being edited (F26 below).

The feature must show clearly that only some languages are published, whichever
language the user is in.

## The site's settings decide

- A paragraph's status (core) and its "Publish on" and "Unpublish on" (the
  Scheduler module) are translatable by default. The content translation
  settings let a site make each of them shared, per paragraph type; a node's
  status per node type. Core keeps one value of a shared field for every
  translation (`ContentEntityBase.php:632-641` in Drupal 11.4), so writing it in
  one language writes it in all.
- The sandbox keeps the defaults: `config/sync` has no
  `core.base_field_override.paragraph.*`, and the Scheduler dates of its nodes
  are translatable to match `status`.
- Since step 1, the editor is told whether the page's status is shared
  (`isStatusTranslatable` in the translation state), but not whether a paragraph
  type's status and dates are. Text field values already carry a flag
  `isTranslatable` per field, and the adapter skips the shared ones when it
  loads a language's texts
  (`src/modules/drupal/runtime/adapter/index.ts:927-930`). A paragraph's
  schedule needs no such flags: blökkli's applies to every language (see
  Decisions).

## F24: a paragraph's schedule applies to one translation

- **Found:** 2026-09-27, 13e of the drupal-setup plan. Its cause was corrected
  on 2026-10-26.
- **Symptom:** "Manage schedule" on a paragraph with a German translation, in
  the English editor, with a "Publish on" date. The English paragraph is hidden
  until the date; the German one is published at once and has no date. The
  action is only offered in the original language: it's `edit-only`, and a
  translation's editor is in the mode "translating".
- **Cause:** the mutation records no language, and the edit state loads the host
  and its paragraphs in their original language (`getMutatedState()` loads the
  host with `loadUnchanged()`, `buildHostProxies()` takes its paragraphs). So
  `set_paragraph_schedule` writes `publish_on`, `unpublish_on` and the status on
  the paragraph's original translation
  (`modules/paragraphs_blokkli_scheduler/src/Plugin/ParagraphsBlokkli/Mutation/SetParagraphSchedule.php:130-141`),
  and Drupal shares what the site shares. The response shows the editor's
  language (`MutatedFieldParagraphs`). Confirmed on 2026-10-26 by a throwaway
  kernel test: with German as the current language, the English paragraph got
  the date and was unpublished; the German one got no date and stayed published.
  Until then, this plan said that the mutation wrote the edit's language, as
  Drupal's form does; since the action is only offered in the original language,
  that's the language being edited.
- **Impact:** a user who means every language schedules one, and a notice
  scheduled to disappear stays in the other languages.
- **By the site's settings:** with all three shared, every language gets the
  same values. With the dates shared and the status per language, every language
  gets the date, but only the original is hidden until then. With the status
  shared and the dates per language, every language is hidden, only the original
  has the date, and cron publishes all of them at it.
- **Tests** can use the Scheduler module: `paragraphs_blokkli_scheduler_test`
  gives it the paragraphs, as the sandbox's patch does.
- **Fixed** in step 3 (2026-10-26): a schedule applies to every language.

## F26: "Publish if unpublished" acts on the default translation

- **Found:** 2026-09-27, 13f of the drupal-setup plan. Reproduced 2026-10-12
  over GraphQL, in sandboxes with English and with German as the original
  language.
- **Symptom:** a news item published in English and unpublished in German,
  published from the German editor with the mode "Publish": German stays
  unpublished. The other way round (English unpublished, German published),
  publishing from the German editor publishes English. English is the original
  language here; with German as the original, it shows from the English editor.
- **Cause:** publishing loads the host through `getHostEntity()`, which returns
  the original language (`src/Entity/ParagraphsBlokkliEditState.php:333`), and
  sets that one published (`src/ParagraphsBlokkliManager.php:323-324`). The
  publish dialog shows the status of the editor's language.
- **Impact:** an editor can't publish a translation from the editor, and may
  publish the original language by accident.
- **By the site's settings:** with a shared status, publishing the original
  language publishes every language, and F26 can't happen.
- **Fixed** in step 2 (2026-10-26): publishing takes the languages to publish.

## What exists today

Read in the code on 2026-10-12, and on 2026-10-25 where noted:

- The editor acts on one status, `state.entity.status`
  (`src/runtime/editor/features/publish/`). The Drupal adapter fills it with the
  status of the language being edited. The title's dot shows it, and turns
  yellow when a published page has pending changes
  (`src/runtime/editor/features/entity-title/index.vue`).
- The state already has every translation's `exists` and `status`
  (`state.translation.value.translations`, `EntityTranslation` in
  `src/runtime/editor/types/state.ts`). Before step 1, only `exists` was used,
  by the language switcher
  (`src/runtime/editor/features/translations/LanguageSwitcher/`: inline buttons,
  or a dropdown for long language codes and on mobile).
- Until step 2: `publish()` sends one flag, `publishIfUnpublished`, without a
  language. A page that is published only has the mode "Publish", so the flag is
  sent on every publish: publishing every language on it would put a translation
  live that was held back on purpose.
- Until step 2: a scheduled publish of the changes passes the flag too
  (`modules/paragraphs_blokkli_scheduler/src/EditStateSchedulerService.php:86`,
  2026-10-25): at the date, it publishes the original language.
- Until step 2: the publish button is disabled without pending changes
  (`src/runtime/editor/features/publish/index.vue:162`), so a language can't be
  published on its own without changing something. The dialog itself doesn't
  check for changes, and neither does the module: `doPublish()` applies the
  mutations, sets the status, saves the host as a new revision and deletes the
  edit state, with or without mutations
  (`src/ParagraphsBlokkliManager.php:289`). It needs a stored edit state, which
  the module stores when an editor opens the page (`getParagraphsEditState()`).
  Confirmed on 2026-10-25 by a throwaway kernel test: a translated, unpublished
  node without mutations, published as the GraphQL resolver does, got its
  original language published and a new revision, kept its German translation
  and paragraphs, and lost its edit state.
- The dialog can list and publish the user's other edit states too, but that
  table is off (`showTable = false` in `Dialog/index.vue`): it only publishes
  the current page.
- The module creates a page's translation as a copy of the original
  (`addTranslation()` with its values), status included.
- A paragraph's edit context resolves `isPublished`, `publishOn` and
  `unpublishOn` on the paragraph of the edit's language
  (`modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/SchemaExtension/EditExtension.php:1026-1030`,
  `modules/paragraphs_blokkli_scheduler/src/Plugin/GraphQL/SchemaExtension/SchedulerExtension.php:66-78`,
  2026-10-25). The canvas greys out a paragraph that is unpublished in that
  language, and the schedule dialog shows that language's dates; nothing hints
  at the other languages.
- Only `set_paragraph_schedule` sets a paragraph's status (2026-10-25). Showing
  a paragraph in some languages only is the job of blökkli's option "Visible
  languages" (`bkVisibleLanguages`), which is shared.
- Stored mutations don't record their language; only some take one as an
  argument, such as the text edits (2026-10-25). The others write the original
  language (F24).
- `set_paragraph_schedule` unpublishes the paragraph for a "Publish on" in the
  future, and publishes it when the date is removed, whatever its status was
  before (2026-10-26). A date the dialog doesn't change isn't sent.

## Decisions

The user, 2026-10-25, unless noted.

**The editor follows the site's content translation settings:** a field that is
per language is handled per language, a shared one covers all languages, as in
Drupal's forms. Otherwise a schedule that Drupal's form keeps per language would
cover every language in blökkli, without the user knowing why. A paragraph's
schedule is the exception (the user, 2026-10-26, below).

- **The page's status, per language, in the language switcher.** Each language
  gets a dot: published, unpublished, or greyed out without a translation, as
  today. In the dropdown, each option has one, and its button shows the current
  language's. The dot at the title stays: it's the status of the current
  language, like the title next to it, and its tooltip names the language
  ("German: published (changes pending)"). With a shared status, the switcher
  has no dots and the tooltip says "Published in all languages". Drupal tells
  the editor whether the page's status is shared.
- **"Publish" publishes the languages the user ticks.** The publish dialog gets
  a section "Languages", one row per translation, with its status and a
  checkbox. Published languages are ticked and locked: publishing never
  unpublishes. The current language is ticked by default. With a shared status,
  the section is one line: "All languages".
  - The mutation `publish` takes the languages to publish instead of
    `publishIfUnpublished`, without a fallback: the editor's alpha only works
    with the latest release of the module, and the other way round.
  - A scheduled publish stores its languages and publishes those at the date.
    Schedules stored before get the page's original language, which they would
    publish until now (the user, 2026-10-26).
  - "Save" is offered only while no translation is published (the user,
    2026-10-26). Drupal saves one revision for every translation, so saving puts
    the changes live in each published one; until now, the dialog offered "Save"
    while the current language was unpublished, and said that the page stays
    unpublished. With a published translation, "Publish" with only the published
    languages ticked does what "Save" did.
  - The dialog opens without pending changes while a translation is unpublished,
    so a translation can be published on its own: the publish button is disabled
    only without changes and with every translation published. Without changes,
    "Save" is disabled, and the summary leaves out its sentence on the changes.
    The module needs nothing for it.
  - The section lists the current page's translations: the dialog only publishes
    that page. If its table of other edit states comes back, each of them needs
    its own languages.
  - On 2026-10-12, the user ruled out a list of languages to tick as a patch on
    its own: it would paper over the missing status per language. Here it comes
    with that status.
- **The dialog says that the changes cover every language.** Its summary lists
  each language's result ("English: stays published · German: will be published
  · French: stays unpublished") under one sentence: "Publishing applies all
  pending changes, in every language." The table lists every language, so it
  needs no count of changes per language, which the module doesn't have.
- **A paragraph's schedule applies to every language** (the user, 2026-10-26).
  This replaces the decision of 2026-10-25 that it covers the languages its
  fields cover. A schedule per language needs a section per language in the
  dialog, each with its toggles and date pickers, as Drupal's form needs each
  translation edited. A site that wants one sets it in Drupal.
  - `set_paragraph_schedule` writes the date on every translation of the
    paragraph, and the status: a "Publish on" in the future unpublishes every
    translation. Removing a "Publish on" publishes only the translations that
    had one, so a translation held back without a date stays unpublished.
  - Schedules stored in pending changes replay with the new rule, so they cover
    every language too: writing only the original language was F24.
  - The dialog's lead says that a date applies to all languages, on every page
    with more than one translation, whatever the site shares. Drupal doesn't
    report its field settings for it.
  - Translations that differ are shown before they're overwritten: while they
    differ, a section lists each language's date and, under "Publish on", its
    status (a translation unpublished without a date gets published at a new
    date). "Set date for all languages" then shows the date picker. A date that
    the user doesn't touch isn't sent, so a schedule set per language in Drupal
    stays until the user changes that date. The paragraph's edit context gets
    every translation's status and dates. Nothing is converted.
  - A list, not notes (the user, 2026-10-26): three yellow notes and the button
    between them were too many. The list looks like the publish dialog's section
    "Languages".
  - "Hide non translatable fields on translation forms" isn't this step's:
    whether blökkli's changes to a shared field clash with it concerns every
    shared field (F122 in
    [the drupal-setup findings](../drupal-setup/findings.md)).

## Work

In this order (the user, 2026-10-25): the status per language first, since F26
can put the wrong language live and its section "Languages" needs that status;
F24 last. Each step is a commit in both repositories where both change.

1. **The status in the language switcher.** Done (2026-10-26). Drupal's flag for
   a shared status, the dots, and the title's tooltip. E2E sandboxes share the
   status of news (`blokkli_playground_test`), to test it.
2. **Publishing per language (F26).** Done (2026-10-26). The mutation `publish`
   with its languages, the scheduled publish with them (a field
   `publish_languages` on the edit state), and the publish dialog's section
   "Languages" and summary. Each language's result sits in its row of the
   section, which the user tried and kept; the summary has the sentence on the
   changes.
3. **The schedule in every language (F24).** Done (2026-10-26).
   `set_paragraph_schedule` writes every translation, the edit context has every
   translation's status and dates, and the schedule dialog lists the languages
   while they differ, which the user tried and kept.

## Related

- F30 in [the drupal-setup findings](../drupal-setup/findings.md): the
  translation form doesn't mark shared fields.
