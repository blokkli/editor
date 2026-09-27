# 05: Seed, bake, reset

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13a–13i

## Goal

Deterministic content and users, and a baked template (database plus files) to
build every sandbox from. The dev site can be reset from the template in
seconds.

## Tasks

- [ ] Write declarative content in `drupal/content/` (YAML). Until
      [chunk 14b](14b-demo-content.md), the pages are placeholders built from
      the base paragraphs of [chunk 04](04-base-content-model.md):
  - [ ] pages as paragraph trees, with field values per language
  - [ ] EN source content with DE and FR translations; some translations
        deliberately outdated
  - [ ] media files in `drupal/content/files/`
  - [ ] library items, templates, a few comments
  - [ ] dates relative to the bake (e.g. an event "in 12 days, 19:30"), so
        events, news and scheduled items never go stale (14a)
- [ ] Drush command `blokkli-playground:seed` in `blokkli_playground` that reads
      the content files. The starterkit's `BlokkliImportCommands.php` hardcodes
      its content as PHP arrays in 1,348 lines. Reuse its entity-creation logic,
      not its data format.
- [ ] Seeded users for 14a's roles (13h): admin, a department editor, the head
      of the department as reviewer, a French translator, a restricted editor.
      Sandboxes have no known passwords (login via token, chunk 09); locally use
      `drush uli` and masquerade.
- [ ] `blokkli-playground:bake`:
  1. install from config
  2. seed
  3. generate image style derivatives
  4. warm the container, config, discovery, router and GraphQL schema caches
  5. clear the render, page and dynamic page caches, which can contain the
     template's hostname
  6. write the template (SQLite file plus files) to
     `drupal/sandboxes/_template/`
- [ ] `ddev bake` and `ddev reset`. `reset` restores the dev site from the
      template.
- [ ] Record bake time and template size under Notes.
- [ ] Update the setup steps in `CONTRIBUTING.md` and CLAUDE.md's Drupal Dev
      Environment section for `ddev bake` and `ddev reset`.

## Acceptance criteria

- `ddev bake` works from scratch and is repeatable.
- `ddev reset` restores the dev site in a few seconds.
- The seeded content renders in all three languages, and every seeded user can
  log in locally.

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
- **Front page:** `system.site.page.front` is still `/node` (the frontpage view
  was removed). Set it to the seeded home page.
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
  baking, so sandboxes get them without network access.
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
