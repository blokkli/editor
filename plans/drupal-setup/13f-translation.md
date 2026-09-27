# 13f: Translation

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 13c
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors translate pages in the editor, with DeepL, and see which translations
are outdated. In Blockingen/Bloquens, German and French are both real languages
of the town (14a); English is the site's source language. Visitors can switch
the language.

## Tasks

- [x] Translation settings for every bundle and field from 13b and 13c,
      reviewed: dates and links are never translated (the user). `created` and
      the button's link became untranslatable.
- [x] DeepL via `paragraphs_blokkli_deepl`. The key comes from the environment
      (chunk 03); never enter it in the settings form, which stores it in
      config. Tested without a key; with a key it's unverified (the user left it
      open).
- [x] Outdated-translation tracking. The demo's deliberately outdated French
      page is seeded in 14b (chunk 05's mechanism).
- [x] A language switch in `playground-drupal` (moved from chunk 06).
- [x] UI strings of `playground-drupal` in DE and FR: nuxt-easy-texts and the
      Drupal `texts` module (the user; replaces chunk 06's "English for now").
- [x] Labels in DE and FR: option labels (the user), and the paragraph type,
      bundle and field labels the editor shows.
- [x] Skills: new `blokkli-setup-translations` 1.0.0; pointers and the "dates
      and links" rule in `blokkli-setup-drupal` 1.0.4,
      `blokkli-add-paragraph-type` 1.1.3 and `blokkli-add-host` 1.0.3.

## Acceptance criteria

- A page can be translated into DE and FR in the editor, with and without DeepL.
  With DeepL: unverified, no key locally (the user, 2026-09-27).
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

### The model as built (2026-09-27)

- **Translatability:**
  - `core.base_field_override.node.{page,news,event,office}.created`:
    untranslatable. Drupal's "add translation" form sets `created` only on
    translatable fields, so new translations keep the date; the storage stays
    translatable, so no `content_translation_created` field appears.
  - `field.field.paragraph.button.field_link`: untranslatable.
  - Unchanged: scheduler's dates (scheduler requires the same setting as
    `status`, `scheduler.module:651-661`), `changed`, the paragraphs' `created`,
    and media source fields. `paragraph.video` stays off without a
    `language.content_settings` file.
  - The page's paragraphs field is called "Content", like the other hosts'.
- **Labels in DE and FR:** language overrides in `config/sync/language/{de,fr}/`
  for every paragraph type (except `from_library`, which has them, and
  `blokkli_fragment`), node, media and config page type, and every field of
  those bundles (116 files). No `config_translation`. locale ignores config
  without a `default_config_hash`, so `locale:update` doesn't touch them.
- **GraphQL server:** the extensions `language_switch_links` and `texts`.
- **texts** (`drupal/texts` 1.0.14, modules `texts` and `texts_graphql`):
  - Texts are content entities. A key creates itself with its English default on
    its first query; German and French are in `drupal/content/texts.csv` (the
    module's export format: `;`, `full_key;type;en;de;fr`).
  - The import skips texts whose context doesn't exist yet and still reports
    success, so the frontend's query has to run first (`tmp/drupal-texts.sh`
    does both; chunk 05 takes over).
  - Results are cached per language: they carry `languages:language_interface`.
- **playground-drupal:**
  - `nuxt-easy-texts` 2.2 (root devDependency), `app/easyTexts.loader.ts`
    (language from the path, `loadTexts` per language endpoint, `{}` on a 403),
    the generated `app/graphql/fragment.easyTexts.graphql` (committed, ignored
    by the formatters).
  - 35 keys, `context.key`, English defaults: every visible string, including
    editor-only placeholders and messages. Event categories are one literal
    `$texts` call per value.
  - Anonymous users get no texts (403). The "This sandbox is private" page stays
    English; `nuxi dev` shows defaults for unloaded keys, a production build
    shows the keys (chunks 10, 12).
  - `app/components/LanguageSwitch/`: EN DE FR from `languageSwitchLinks`
    (Drupal lists only translations that exist and can be viewed), the current
    language from the path, a missing one greyed out. It sits in the site
    header's new slot, around nodes, and hides with `blokkliEditing` or
    `blokkliPreview` in the query.
  - `<html lang>` from the path; file sizes with `Intl.NumberFormat`.
  - Option labels as `{ en, de, fr }` maps, and `bkVisibleLanguages` redefined
    in `nuxt.config.ts` (F28). `drupal/blokkli-options-schema.json` carries
    them.
- **Setup order for nuxt-easy-texts** (or the daemon hangs on an invalid
  document): the schema with `TextsLoader`, the loader and a `$texts` call, the
  module in `nuxt.config.ts`, wait for the fragment file, then the query. A
  query added before the fragment was read fails with "Fragment not found:
  easyTexts" until `ddev nuxt restart`.

### Decisions (2026-09-27)

- The user:
  - DeepL with a real key stays open.
  - A missing key is a misconfigured site; the error the editor shows is as
    designed.
  - UI strings through nuxt-easy-texts and the Drupal `texts` module, as in the
    starterkit.
  - Option labels in DE and FR.
  - Dates and links are always untranslatable.
- **A language without a translation is greyed out** in the switch, as in the
  starterkit; the current language comes from the path, since Drupal's links
  leave it out on a fallback page.
- **`/de/x` without a German translation shows the English content** (Drupal's
  fallback), as before.
- **The frontend switch hides while editing and previewing.** The editor has its
  own switcher; the links would leave the preview.
- **Labels the editor shows from Drupal** are translated too, the same way as
  13d's date format.

### Verification (2026-09-27)

- **Config:** `si --existing-config -y`, `config:status` clean, `needsUpdates()`
  false. `drupal:schema`: `LanguageSwitchLink`, `TextsLoader` and the texts
  types. The daemon: "supports all features". A second `si` and `locale:update`:
  still clean. (Once, after the first, a stale plugin cache reported a field
  type that "does not exist" until `drush cr`; not reproduced.)
- **`tmp/drupal-translation-check.sh`** (GraphQL as admin):
  - **Switch links:** `/de/node/6` (EN, DE) lists de and en; `/fr/node/6` lists
    the same, none active; the office lists all three with their native names.
  - **By hand:** DE and FR edits create the translations; an EN edit marks both
    outdated; clearing DE leaves FR; publish saves the flags (FR outdated).
  - **Import:** `bulk_translate_field_values` with `clearOutdated` clears FR.
  - **DeepL without a key:**
    `{success: false, errors: ["DeepL API key is not configured."]}`.
  - **"Publish if unpublished"** from `/de`: EN published and DE unpublished
    stays so; EN unpublished and DE published publishes EN (F26).
  - **Texts:** German and French after the import; the same query alternating
    between `/en`, `/de` and `/fr` returns each language.
- **Browser** (as admin):
  - an event in DE ("Markt", "Datum", "Ort") and the office in FR ("Horaires
    d'ouverture", "Fermé"); the switch links, greys out and marks the current
    language; `<html lang>`; no console errors
  - the editor in DE: the switch hidden; "Abschnitt", "Inhalt » Seite",
    "Sichtbare Sprachen"; "Texte übersetzen" opens and shows the DeepL error
  - outdated: an EN change published, then in DE the outline and "1 Block hat
    eine veraltete Übersetzung."; "Alle als aktuell markieren" clears it
  - a new FR translation of a news item from the switcher (Drupal's form, in
    French): the editor switches to it, the date is unchanged. The dialog title
    lacks the language (F31).
  - the switcher on the site config page (FR: "Bloquens") and a library item
    (the texts switch language on the client too)
  - the switch hides with `blokkliPreview`
