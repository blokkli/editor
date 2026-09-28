# 08: Sandbox routing

- **Status:** todo
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 05

## Goal

The request's Host decides which sandbox handles it: database, files and hash
salt. Code and processes are shared.

## Tasks

- [ ] ddev: wildcard hostnames (`*.blokkli` → `*.blokkli.ddev.site`). Verify
      that ddev and mkcert support the wildcard. nginx needs no change: its
      public server is the `default_server` for every hostname (chunk 02).
- [ ] A `settings.php` include that:
  - [ ] parses the subdomain into a sandbox id, with a strict regex
  - [ ] serves a static "expired or unknown sandbox" page when the id is
        unknown, without bootstrapping Drupal against a missing database
- [ ] Per sandbox, set:
  - [ ] the database: `drupal/sandboxes/<id>/db.sqlite`
  - [ ] public files: `sites/default/files/sandboxes/<id>`
  - [ ] private and temp files under `drupal/sandboxes/<id>/`
  - [ ] `hash_salt = HMAC(secret, id)`. This is required (see the README
        reference on APCu prefixes and login links).
  - [ ] `trusted_host_patterns`
- [ ] Share compiled Twig across sandboxes (`$settings['php_storage']['twig']`);
      it depends only on code.
- [ ] APCu: every sandbox adds its own entries. Size `apc.shm_size` for it, or
      turn off the chained fast backend for sandboxes. Measure.
- [ ] Nuxt: forward the original Host on SSR GraphQL requests. No Nuxt-side
      cache that isn't keyed by Host.
- [ ] A Host with no subdomain gets the default site: the dev site locally, the
      control plane when hosted.
- [ ] Document how to run drush against a sandbox (`--uri`).

## Acceptance criteria

- Two sandboxes copied from the template (`a1.blokkli.ddev.site`,
  `b2.blokkli.ddev.site`) are fully independent: edits, config cache, logins and
  files.
- An unknown id returns the "expired or unknown" page.

## Notes

- The per-sandbox database settings need the same options as the dev site:
  `synchronous=NORMAL` and the memory backend for the entity cache bin (see
  "SQLite settings to use" in [chunk 01](01-sqlite-spike.md)). Without the
  memory bin, concurrent reads and writes lose edits.
- From [chunk 02](02-ddev-and-repo-layout.md): nginx sends Drupal the host the
  browser asked for, as `Host` (from `X-Forwarded-Host` if present). So
  `settings.php` can read the sandbox id from `$_SERVER['HTTP_HOST']`, also for
  Nuxt's SSR requests, as long as Nuxt forwards `X-Forwarded-Host` (chunk 06).
  Tested with a simulated SSR request for `a1.blokkli.ddev.site`.

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Include point:** settings.php sets the site's database, private files and
  hash salt in one block at the top, marked for the sandbox include.
- **Hash salt:** derive it as `HMAC(DRUPAL_HASH_SALT, id)`. The hosted site must
  have its own `DRUPAL_HASH_SALT` (settings.php refuses to run hosted without
  one), and the salt is what protects login links for seeded users.
- **Trusted hosts** come from `DDEV_HOSTNAME` (comma-separated). A wildcard
  hostname needs its own pattern, not `preg_quote`.

From [chunk 05](05-seed-bake-reset.md) (2026-09-28):

- **The template** is `drupal/sandboxes/_template/<source language>/`: the
  database (`db.sqlite`, written with `VACUUM INTO`, no `-wal`/`-shm`) and
  `files/` with the public `media`, `media-icons` and `styles` folders, which go
  into the sandbox's public files. One template per source language
  (`ddev bake --source=de`).
- `ddev reset` copies a template over the dev site in 8–17 ms
  (`cp --reflink=auto`).
