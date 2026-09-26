# 05: Seed, bake, reset

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13

## Goal

Deterministic content and users, and a baked template (database plus files) to
build every sandbox from. The dev site can be reset from the template in
seconds.

## Tasks

- [ ] Write declarative content in `drupal/content/` (YAML). Until
      [chunk 14](14-demo-content.md), the pages are placeholders built from the
      base paragraphs of [chunk 04](04-base-content-model.md):
  - [ ] pages as paragraph trees, with field values per language
  - [ ] EN source content with DE and FR translations; some translations
        deliberately outdated
  - [ ] media files in `drupal/content/files/`
  - [ ] library items, templates, a few comments
- [ ] Drush command `blokkli-playground:seed` in `blokkli_playground` that reads
      the content files. The starterkit's `BlokkliImportCommands.php` hardcodes
      its content as PHP arrays in 1,348 lines. Reuse its entity-creation logic,
      not its data format.
- [ ] Seeded users: admin, editor, reviewer, restricted editor, translator.
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
