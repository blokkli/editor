# 13f: Translation

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13c
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors translate pages in the editor, with DeepL, and see which translations
are outdated. In Blockingen/Bloquens, German and French are both real languages
of the town (14a); English is the site's source language. Visitors can switch
the language.

## Tasks

- [ ] Translation settings for every bundle and field from 13b and 13c:
      paragraph fields translatable, the hosts' paragraphs fields not; decide
      per structured field (e.g. an event's date isn't translated, its place
      is).
- [ ] DeepL via `paragraphs_blokkli_deepl`. The key comes from the environment
      (chunk 03); never enter it in the settings form, which stores it in
      config.
- [ ] Outdated-translation tracking. The demo has one deliberately outdated
      French page (14b).
- [ ] A language switch in `playground-drupal` (moved from chunk 06).
- [ ] Skill: new `blokkli-setup-translations`: content translation for
      paragraphs and hosts (which fields are translatable, which aren't), DeepL,
      outdated-translation tracking.

## Acceptance criteria

- A page can be translated into DE and FR in the editor, with and without DeepL.
- An outdated translation is marked as such.
- The skill exists.

## Notes

- **13b set the translation settings of its types** (its "model as built"
  table): review them here. Nested paragraphs fields are untranslatable.
- **13c set them for news, event, office and both config pages** (translation
  on; see its "model as built"). The teaser and contact blocks have translation
  off.
- **Config pages need a translation per language,** or the frontend shows (and
  blökkli edits) the default translation. 13c's test content creates them.
- **Event category labels** are English in the frontend: `list_string` only
  exposes the key. Translate the allowed values in Drupal and expose the labels,
  or keep a map per language.
- **Option labels are English only.** playground-drupal sets no
  `defaultLanguage`, so the options schema and the editor show English labels.
  Decide whether option labels get DE and FR.
- **Without a DeepL key** (the default locally and in CI), the editor must still
  work: check what the translation feature shows then.

From [13d](13d-reusable-content.md) (2026-09-27):

- **Library items are translatable.** "Add to library" creates a translation for
  each language of the block, each with the source label. Check the language
  switch on an item's page.
- **Templates stay in English:** their route has no language.
- **The fragments' placeholders** ("No upcoming events") are English.
- **`locale` is enabled** (13d, for dates formatted by Drupal), with the DE and
  FR interface translations. The date format `day` has a German pattern. Other
  UI strings of the frontend (labels such as "Date", "News") are still English,
  and `config_translation` (the UI for config translations) isn't enabled.

From [13e](13e-publishing.md) (2026-09-27):

- **The preview link opens the default language** (F22).
- **Paragraph schedules are per translation** (F24). A paragraph scheduled in EN
  stays published in DE.
- **Events:** the hook sets `unpublish_on` on every translation.
- **"Publish if unpublished"** publishes the default translation (read in
  `ParagraphsBlokkliManager.php:175-177`, not tested). Check it with an
  unpublished DE translation.
