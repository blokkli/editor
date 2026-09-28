# 05: Seed, bake, reset

- **Status:** done
- **Milestone:** M1 Local dev site
- **Depends on:** 13a–13i

## Goal

Deterministic content and users, and a baked template (database plus files) to
build every sandbox from. The dev site can be reset from the template in
seconds. The content's original language can be chosen per bake (the user,
2026-09-28).

## Tasks

- [x] Write declarative content in `drupal/content/` (YAML). Until
      [chunk 14b](14b-demo-content.md), the pages are placeholders built from
      the base paragraphs of [chunk 04](04-base-content-model.md):
  - [x] pages as paragraph trees, with field values per language
  - [x] EN, DE and FR, any of them the source language; one translation
        deliberately outdated
  - [x] media files in `drupal/content/files/`
  - [x] library items, templates, a few comments
  - [x] dates relative to the bake (e.g. an event "in 12 days, 19:30"), so
        events, news and scheduled items never go stale (14a)
- [x] Drush command `blokkli-playground:seed` in `blokkli_playground` that reads
      the content files. The starterkit's `BlokkliImportCommands.php` hardcodes
      its content as PHP arrays in 1,348 lines. Reuse its entity-creation logic,
      not its data format.
- [x] Seeded users for 14a's roles (13h): admin, a department editor, the head
      of the department as reviewer, a French translator, a restricted editor.
      Sandboxes have no known passwords (login via token, chunk 09); locally use
      `drush uli --name=…`.
- [x] Bake (`ddev bake`, with the drush command `blokkli-playground:template`):
  1. install from config
  2. seed
  3. generate image style derivatives
  4. warm the container, router and GraphQL schema caches
  5. clear the render, page and dynamic page caches, which can contain the
     template's hostname
  6. write the template (SQLite file plus files) to
     `drupal/sandboxes/_template/<source language>/`
- [x] `ddev bake` and `ddev reset`. `reset` restores the dev site from the
      template.
- [x] Record bake time and template size under Notes.
- [x] Update the setup steps in `CONTRIBUTING.md` and CLAUDE.md's Drupal Dev
      Environment section for `ddev bake` and `ddev reset`.

## Acceptance criteria

- `ddev bake` works from scratch and is repeatable.
- `ddev reset` restores the dev site in a few seconds.
- The seeded content renders in all three languages, and every seeded user can
  log in locally.

## Content in code, a source language per bake (2026-09-28)

The user: the content is written in code (reproducible, clear intent), and the
source language of the created entities can be chosen. The audience is Swiss and
would rather have their own language as the original than English.

Decisions (the user):

- **Drupal's default language stays EN.** blökkli and paragraphs_blokkli use
  each entity's own original language, and every URL has a language prefix, so
  only the content's language varies. Changing Drupal's default is costly: it's
  read from the raw config into the container (a settings.php override doesn't
  work), and the locale module then rewrites the language of all config that
  modules ship (drift from config/sync).
  - New content gets the language it's created in:
    `default_langcode: current_interface` (was `site_default`) for the node,
    media, menu link, library item and template bundles.
  - The UI texts stay EN-based, like the defaults in the code.
- **Minimal placeholders:** one entity per host type and every paragraph type
  once, complete in EN, DE and FR. 14b replaces them in the same format.
- **One template per bake, EN by default:** `ddev bake [--source=de]`,
  `ddev reset [de]`. Chunk 09 decides which templates sandboxes offer.

As built:

- **The format** (`drupal/content/README.md`): YAML, one file per entity type
  and one per node. Language maps (`{ en: …, de: …, fr: … }`) on translatable
  fields, references by key (`{ node: town-hall }`), relative dates, paragraphs
  nested as lists, options as maps (JSON for the chart and the embed). An entity
  gets a translation in every language of its maps. Our own format, not core's
  default content (`Drupal\Core\DefaultContent\Importer`, 11.4.7): that one is
  `@internal`, can't change an entity's original language (its `_meta` is
  readonly in the events) and can't export paragraphs.
- **`blokkli_playground`:** `Seed/Seeder.php` (with `Item`, `Ref`,
  `SeedException`) and `Drush/Commands/SeedCommands.php`
  (`blokkli-playground:seed [--source] [--content]`,
  `blokkli-playground:template <directory>`).
  - Every file is read and checked first (unknown fields, language maps on
    untranslatable fields, missing source values, unknown references, keys);
    then everything is created in one transaction, each entity validated. A
    problem in either step creates nothing.
  - Deterministic: UUIDs are version 5, from the keys; node IDs are the files'
    `id` or the next free one in file order; the home page has `id: 1`, and
    `system.site.page.front` is now `/node/1` (was `/node/16`). Two bakes gave
    the same IDs, UUIDs and languages.
  - Paragraph translations are added per paragraph (the reference field
    doesn't); `content_translation_source` and `_outdated` are set.
  - The chart keeps its texts in the host's source language: the files give
    every language in `translations`, and the seed moves the source's into the
    chart.
  - Comments are created as entities; the comment module notifies the mentioned
    users, as in the editor.
  - The UI texts are created from `texts.csv` directly, without the frontend's
    `loadTexts` query first (13f's workaround).
- **`ddev bake`** (`.ddev/commands/web/bake`): deletes the database and the
  `media`, `media-icons` and `styles` files, `drush si --existing-config` (which
  also imports the interface translations: `locale:update` isn't needed), seed,
  `drush cr`, `blokkli-playground:template`, then copies the files into the
  template. **`ddev reset`** copies them back.
- **Config:** the user form display hides `path`. Every install added it
  (neither shown nor hidden in the config), so `config:status` wasn't clean
  after an install.
- **Content:** 6 nodes (home, administration, building permits, town hall, a
  news item with an outdated French translation, an event), 6 media (generated
  placeholder images, a PDF, a remote video), a library item, 2 templates,
  footer and site, the main menu, the 4 test users of 13h, a comment thread, the
  81 UI texts.
- **Not changed:** the templates' route stays without a language. Reading the
  code suggested that a German template edited there would get an English
  translation; with a DE bake, editing it changed its German source (templates
  aren't translatable).

Numbers (local, ddev on btrfs):

- Bake: 10–18 s (EN and DE), template 18 MB (database 17.7 MB after
  `VACUUM INTO`, 36 image style derivatives).
- Reset: 8–17 ms. The first request afterwards: 0.12 s.

Verification:

- Two EN bakes: the seeded entities' IDs, UUIDs and languages are identical;
  only the installer's (anonymous, admin, the media icons) differ.
  `drush config:status` is clean after each bake.
- `ddev bake --source=de`: every seeded entity's original is German, EN and FR
  are translations, the news item's FR translation is outdated, the chart's
  texts are German with EN and FR translations. In the editor, the building
  permits page is in edit mode in German and in translation mode in English and
  French.
- A broken copy of the content (an unknown field, an unknown node, a missing
  source value, a map on an untranslatable field) reported all four and created
  nothing; an invalid email address, found while creating, rolled everything
  back.
- The 18 pages (6 nodes × 3 languages) return 200 without console errors. The
  test users log in; Anna edits, Marc sees the page read-only with her mention,
  Anna has Marc's reply; the template page opens.

## Notes

From the [SQLite spike](01-sqlite-spike.md) (2026-09-26):

- **Write the template with `VACUUM INTO`, run through Drupal's connection**
  (e.g. `drush php:eval`), not the `sqlite3` CLI. Drupal registers the
  `NOCASE_UTF8` collation in PHP, and its indexes use it. The CLI therefore
  fails on `VACUUM` and on queries that touch those indexes ("no such collation
  sequence: NOCASE_UTF8").
- `VACUUM INTO` also checkpoints the WAL and drops free pages. The resulting
  file is self-contained, so a copy needs no `-wal`/`-shm` files. It took 34 ms
  for a 12 MB database.
- Copying the template takes 4–14 ms, and a reflink copy (`cp --reflink=auto` on
  btrfs/xfs) takes 1 ms. `ddev reset` can be near-instant.
- Deleting a sandbox or restoring the dev site must also remove the `-wal` and
  `-shm` files of the old database.

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Install from config:** `drush si --existing-config -y` works on an empty and
  on an existing database. drush drops the tables through the `sqlite3` CLI,
  which works despite the `NOCASE_UTF8` collation. Bake should still delete
  `drupal/db/site.sqlite*` first: that also clears `-wal`/`-shm` files and can't
  lose a lock race with a running request.
- **Front page:** `system.site.page.front` is `/node/16`, the test home page
  from [15c](15c-site-structure.md). The seed must create the home page with
  that id, or set the front page after creating it.
- **The main menu** (15c) is content: `menu_link_content`, translated. The seed
  creates it after the pages, then generates the aliases
  (`drush pathauto:aliases-generate all canonical_entities:node`): the pages'
  aliases come from their place in the menu.
- **New routes:** a custom module or view with a new first path segment needs it
  in nginx's Drupal list and a `ddev check-routes` row.

From [chunk 04](04-base-content-model.md) (2026-09-26):

- **Remote videos need the network.** Creating a `remote_video` media item
  fetches its oEmbed data and thumbnail from YouTube or Vimeo. Seeding and
  baking do so too, unless the seed sets the thumbnail itself.
- **The media library lists media of every mapped bundle**, so seeded media
  shows up there right away.

From [13c](13c-hosts.md) (2026-09-26):

- **Config pages are content:** the seed creates the `footer` and `site`
  entities, with DE and FR translations. `si --existing-config` doesn't.
- **Clear the caches after seeding them:** a null `footerConfig` stays in the
  GraphQL response cache.
- **Office hours** are `office_hours` items (`day` 0 = Sunday, times as HHMM
  numbers). Event dates are stored in UTC.
- `tmp/drupal-hosts-content.php` (not committed) was 13c's test content.

From [13d](13d-reusable-content.md) (2026-09-27):

- **Library items and templates are content**, including the default template
  for new columns. The search providers are config.
- **Create each default template once:** a second default for the same type is
  refused after its paragraphs were saved.
- **Library items** are saved when the page that made them is published. Seeding
  them directly (a `paragraphs_library_item` with its paragraph, and a
  `from_library` block referencing it) avoids that.
- **Interface translations** (month names, the admin) aren't config: import them
  with `drush locale:check && drush locale:update` (from drupal.org) before
  baking, so sandboxes get them without network access. The same commands import
  `blokkli_playground`'s own (`translations/de.po`, `fr.po`, since 13g): the
  labels of its transform plugin.
- `tmp/drupal-reusable-content.php` and `tmp/drupal-reusable-mutations.sh` (not
  committed) were 13d's test content.

From [13e](13e-publishing.md) (2026-09-27):

- **The scheduler patch** comes with `composer install` (composer-patches). A
  `si --existing-config` installs the paragraphs' scheduler fields by itself.
- **Seeded events** get their unpublish date from `blokkli_playground`'s hook
  when they're saved; don't seed it.
- **Scheduled content goes stale.** Dates are relative to the bake, and the
  template ages: a sandbox's first cron publishes the scheduled news and removes
  the notice. Rebake often, or shift the dates when a sandbox is claimed (chunk
  09).
- **Cron** runs per sandbox (`drush cron --uri`, chunk 09). Without it, nothing
  scheduled changes.

From [13f](13f-translation.md) (2026-09-27):

- **UI texts:** import `drupal/content/texts.csv` (the `texts` module's format,
  `;`-separated). The import skips a text whose context doesn't exist yet and
  still reports success: send the frontend's `loadTexts` query first, which
  creates every key, then import. `tmp/drupal-texts.sh` (not committed) does
  both, with `TextsImportForm`'s batch methods.
- **Interface translations** (`locale:update`) don't cover the texts or the
  labels: those are content and config.
- **The outdated French page (14b):** set `content_translation_outdated` on its
  paragraphs' FR translations (and publish, or write them directly: the edit
  state only saves the flags on publish). The node's own flag only shows in
  Drupal's translation overview.
- **Dates and links are untranslatable:** set them once, on the source.
- `tmp/drupal-translation.php`, `tmp/drupal-texts.sh` and
  `tmp/drupal-translation-check.sh` (not committed) were 13f's.
