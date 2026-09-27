# 13g: Search and plugins

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 13c, 13d
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors can search offices, events, news and pages from the editor, and drop
results onto a page as teaser or contact blocks (13c's entity mappings). The
starterkit's example plugins run in the custom module, adapted to 14a's block
types. Custom PHP gets phpcs and phpstan gates.

## Decisions

### The user (2026-09-27)

1. **`entity_query` for now,** as in the starterkit and Winterthur: no search
   backend. Typesense would find more (typos, ranking), but
   `search_api_typesense` doesn't run Search API queries: its `search()` only
   counts documents, because it expects the frontend to query Typesense. So
   blökkli's `search_api` provider can't use it, and a Typesense search plugin
   of our own would be over-engineering for now. `search_api_db` has the same
   weaknesses as `entity_query`.
2. **phpcs and phpstan** become gates of `bun run verify`.

### Proposed

3. **One provider, "Content":** `entity_query` over detail and editorial pages,
   news, events and offices. The editor shows it as a tab of its search. Media,
   the library dialog and templates keep their providers. Library items stay in
   the library dialog: `entity_query` searches one entity type per provider, and
   a second tab would duplicate the dialog.
4. **The plugins** in `blokkli_playground`:
   - **Transform** "Search and replace" on text and title paragraphs, e.g. a
     renamed office.
   - **Conversions** text ↔ title and button → text.
   - **No mutation plugin** (the user, 2026-09-27): one only does something once
     the frontend calls it, and the starterkit's `add_teaser_from_node_id` isn't
     called anywhere. The skill points to blökkli's own mutations.
5. **The gates:** phpcs (`Drupal`, `DrupalPractice`) and phpstan (level 5, with
   `phpstan-drupal` and the deprecation rules) over `web/modules/custom`. Level
   6 wants the value types of arrays in docblocks, which the Drupal conventions
   leave out; the starterkit runs level 0. They run on the host or in the
   container, wherever `verify` runs, and are skipped without PHP or `vendor`.

## Tasks

### Gates

- [x] `drupal/coder`, `mglaman/phpstan-drupal`,
      `phpstan/phpstan-deprecation-rules` as dev requirements; `phpcs.xml.dist`
      and `phpstan.neon` in `drupal/`.
- [x] A `php` gate in `scripts/verify.sh`; the existing custom module passes it.

### Search

- [x] The provider "Content" (decision 3), with its DE and FR labels.
- [x] In the editor: find a page, a news item, an event and an office in each
      language; drop them as a teaser and a contact.

### Plugins

- [x] The transform and the conversions, each tested in the editor.
- [x] Their labels in DE and FR (a translation file per language).

### Skills and plans

- [x] New `blokkli-setup-search` and `blokkli-write-drupal-plugin`.
- [x] findings.md: `EntityQuery::getEntityText()` (13c's note), F32.

## Acceptance criteria

- The search finds offices, events, news and pages in EN, DE and FR, and a
  result can be added as the matching block.
- Every example plugin works in the editor.
- `bun run verify` includes phpcs and phpstan and passes; `drush config:status`
  is clean.
- The skills exist.

## As built

### Gates

- **Dev requirements:** `drupal/coder` 9, `mglaman/phpstan-drupal` 2.2 and
  `phpstan/phpstan-deprecation-rules` 2. `phpstan.neon` includes their rules
  itself: without `phpstan/extension-installer`, phpstan knew no Drupal class.
- **`verify`'s `php` gate** runs phpcs and phpstan as two gates, on the host
  (PHP 8.5) or in the container. `CLAUDE.md` lists it.
- **They found one bug:** the event hook (`EventHooks.php`, 13e) read the date
  range item's untyped magic properties. It checks for a `DateRangeItem` now;
  the unpublish date is still set.

### Search

- **Typesense first, then dropped** (the user's decision 1): the ddev service,
  the module and the container's volume were removed again.
- **The provider "Content"** (`entity_query`), with the lead as its text field
  and its label as language overrides ("Inhalte", "Contenus"). A script in the
  ignored `tmp/` made it; exported.
- **F32:** results come in the source language, and the lead never shows below
  them (`string_long`).

### Plugins

In `blokkli_playground`, with attributes:

- **`SearchAndReplace`** (transform, on text and title paragraphs):
  - It replaces in the text nodes only, so links keep their URLs; the
    starterkit's replaced in the markup.
  - It's offered in translations too (`applies()`), and edits the translation of
    the request's language: the transform mutation passes none (F33).
  - The replacement may be empty, which removes the text.
- **Conversions:**
  - `TextToTitle`: the text without markup, blocks separated by a space.
  - `TitleToText`: the title as the text's `<h2>`.
  - `ButtonToText`: a paragraph with the button's link. A document's link is its
    file, as in the button block, and each translation links in its own
    language.
- **Labels in DE and FR:** `translations/de.po` and `fr.po` in the module, as
  its `interface translation server pattern`, imported with
  `drush locale:check && drush locale:update`. "Search" and "Replace with" have
  a context, so core's "Search" keeps its translation.

### Skills and docs

- **New:** `blokkli-setup-search` and `blokkli-write-drupal-plugin` (1.0.0).
  `blokkli-setup-drupal` (1.0.5) names them.
- **The docs** said conversions need "field mapping configuration". There's
  none: each conversion is a plugin (`docs/modules/drupal/configuration.md`).

## Verification (2026-09-27)

- **Gates:** `bun run verify` passes in the container, all 10 gates with phpcs
  and phpstan; `drush config:status` is clean.
- **The search, through the editor's adapter:**
  - The tab "Content" / "Inhalte" / "Contenus".
  - Offices, news, events and pages are found in EN, DE and FR (e.g. "rathaus"
    finds the town hall).
  - The town hall dropped as a contact, and the open-air cinema as a teaser, on
    "Building permits". Reverted.
- **The plugins,** in the editor and reverted:
  - "permit" → "licence" in English, and "Bewilligung" → "Genehmigung" in
    German, each without touching the other language.
  - A text to a title, and the button "All offices" to a text with its link.
  - The labels in DE and FR.
- **Cleaned up:** an unreverted edit state from 15b's tests on "Hosts (13c)"
  (header option changes the detail page no longer has).

## Notes

From [chunk 03](03-drupal-base-site.md) and [04](04-base-content-model.md)
(2026-09-26):

- **Search providers** are config entities
  (`paragraphs_blokkli_search.blokkli_search_provider.*`). The media library
  provider exists since chunk 04; a content provider is still missing.
- **Port `add_teaser_from_node_id`**: it was the only blökkli mutation in the
  starterkit's schema that the local one lacked. Since chunk 07,
  `build/drupal-schema.graphql` is the local dump.

From [13c](13c-hosts.md) (2026-09-26):

- **The node mappings exist** (page, news, event → teaser; office → contact),
  but no content search provider yet: that's the task here.
- **`entity_query`'s text fields,** to verify: `EntityQuery::getEntityText()`
  seems to iterate the setting's values (unchecked boxes are stored as `0`), and
  `string_long` (the lead) isn't among its field types. Record it in findings.md
  if it holds.
- **The custom module `blokkli_playground` exists** (13c: a route subscriber for
  config pages). Add the plugins there.

From [13d](13d-reusable-content.md) (2026-09-27):

- **The `library_items` and `templates` providers exist:** they serve the "From
  library" and "Template" dialogs. The library in the editor's search (a
  search_api provider) is separate, and 13g's.
