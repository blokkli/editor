# 08: Sandbox routing

- **Status:** done
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 05

## Goal

The request's Host decides which sandbox handles it: database, files and hash
salt. Code and processes are shared.

## Tasks

- [x] ddev: `additional_hostnames: ["*.blokkli"]`. mkcert's certificate covers
      `*.blokkli.ddev.site`, the router serves it, and `DDEV_HOSTNAME` is
      `blokkli.ddev.site,*.blokkli.ddev.site`.
- [x] `settings.php` (inline: `.gitignore` tracks no other file in
      `sites/default`):
  - [x] An entry `*.<base>` in `DDEV_HOSTNAME` makes `<id>.<base>` a sandbox.
        Ids match `^[a-z0-9]{2,32}$`. No subdomain is the default site: the dev
        site locally, the control plane when hosted.
  - [x] An unknown or invalid id throws: SQLite would otherwise create an empty
        database. Visitors never get there, see nginx.
  - [x] Per sandbox:
    - the database `drupal/sandboxes/<id>/db.sqlite`, with the dev site's
      options
    - public files `sites/default/files/sandboxes/<id>`
    - private and temporary files `drupal/sandboxes/<id>/{private,tmp}`
    - `hash_salt = HMAC(base salt, id)`
    - trusted hosts: only its own
  - [x] `$settings['blokkli_sandbox']` holds the paths and the id pattern, for
        the module.
- [x] Shared with the default site: compiled Twig (`php_storage['twig']`, with
      the base salt as its secret, which names the files) and the CSS/JS
      aggregates (`file_assets_path`).
- [x] APCu, measured (see Notes): sandboxes keep their cache bins in their
      databases. The prefixes leave out the hash salt
      (`apcu_ensure_unique_prefix`), so the class loader and the file cache are
      shared by all sites.
- [x] nginx: a sandbox without a database gets a static page for every path
      (`.ddev/nginx_full/sandbox-unknown.html`, 410, `no-store`). This replaces
      chunk 02's "nginx needs no change". `ddev check-routes` checks it.
- [x] Nuxt forwards the Host on its server-side requests (chunk 06). It has no
      server-side cache.
- [x] The `blokkli_sandbox` module: `SandboxManager` (create, delete, list) and
      drush commands. 09's claim and cleanup reuse the service.
- [x] Documented in CONTRIBUTING.md and CLAUDE.md: the commands, and drush with
      `--uri`.

## Acceptance criteria

- [x] Two sandboxes from the templates (`a1` from `en`, `b2` from `de`) are
      independent. Tested over HTTP and drush:
  - **Edits:** a node edited in a1 shows only there, also through Nuxt's
    server-side GraphQL.
  - **Config, through PHP-FPM:** each has its own site name.
  - **Logins:** a1's session cookie is anonymous on b2, and a1's login link is
    refused on b2.
  - **Files:** a file written in a1 lands in `files/sandboxes/a1/`, and b2 has
    no record of it.
- [x] An unknown id gets the static page for `/`, `/en/graphql` and `/_nuxt/…`.
      `drush --uri` with it fails without creating a file.
- [x] In the browser (the user, 2026-10-02): editing and publishing in a1, an
      image uploaded in a1, neither visible in b2 or on the dev site, and the
      page for an unknown id.

## Notes

Decided with the user (2026-10-02):

- **nginx catches unknown sandboxes**, not settings.php: Nuxt serves the pages,
  so Drupal alone would leave Nuxt to show the error.
- **Sandboxes are created by drush commands in `blokkli_sandbox`,** not a bash
  ddev command: 09's claim needs the same in PHP.

Found while building it (2026-10-02):

- **The image style route has the public path of when the router was built:**
  - `image.style_public` is `/sites/default/files/styles/…` in every sandbox's
    copied router, so new derivatives were 404s.
  - `blokkli_sandbox` adds `/sites/default/files/sandboxes/{sandbox}/styles/…`,
    with core's controller. A new sandbox needs no router rebuild, and after a
    rebuild core's own route matches first.
  - Nothing else in a fresh sandbox's database has the dev site's public path
    (all tables searched). The CSS/JS asset routes use the shared aggregates.
- **The nginx check is a server-level `if`, with the page in a named location.**
  An `error_page` to a URI is an internal redirect, which runs the server-level
  check again.
- **Copying:** plain PHP `copy()` of the 32 MB database and 130 files. A create
  plus a delete, with two drush bootstraps, takes 0.7 s. The database is copied
  last, under another name, then renamed: nginx and settings.php only see
  complete sandboxes. The filesystem is ext4 here, so there are no reflinks.
  Hard links would save space hosted, but Drupal can overwrite files in place
  (`copy()` with `FileExists::Replace`), which would change every sandbox.
- **APCu, measured** with the dev site, a1 and b2 warmed (pages, admin pages,
  GraphQL through Nuxt); `apc.shm_size` is 32M:
  - Before: every site added its own class loader (1.2 MB) and file cache
    (1.0–1.2 MB). Sandboxes would also add their chained fast bins (the default
    site's: 2.8 MB, mostly discovery). That's about 5 MB per sandbox, so some
    eight sites would fill APCu.
  - After: 2.7 MB in total, however many sandboxes: one shared class loader (0.7
    MB) and the default site's bins.
  - Request times on a1 are the same either way: admin content 89 → 92 ms, the
    route query through Nuxt 34 → 35 ms.
- **The chained fast bins** in core are bootstrap, config, discovery and routes
  (`core.services.yml`); no contrib module adds one. A new one would have to
  join the list in settings.php, or it would be shared across sandboxes.
- **`ddev bake` doesn't touch sandboxes,** and a sandbox keeps the code version
  its template was baked for. After schema or config changes, recreate them.

From [chunk 02](02-ddev-and-repo-layout.md) (2026-09-26):

- nginx sends Drupal the host the browser asked for, from `X-Forwarded-Host`
  when present, so settings.php reads the id from `$_SERVER['HTTP_HOST']`. drush
  `--uri` sets it too.

From [chunk 05](05-seed-bake-reset.md) (2026-09-28):

- **The template** is `drupal/sandboxes/_template/<source language>/`: the
  database (`VACUUM INTO`) and `files/` with `media`, `media-icons` and
  `styles`. Its caches are warm and hold nothing host-specific.
