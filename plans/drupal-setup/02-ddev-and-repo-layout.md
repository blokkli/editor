# 02: ddev and repo layout

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 01 (database engine)

## Goal

`ddev start` at the repo root brings up a web container with one domain,
`https://blokkli.ddev.site`. nginx routes by path to Nuxt or Drupal, and a Nuxt
dev server runs as a ddev daemon. This chunk also puts the Drupal Composer
project and the `paragraphs_blokkli` submodule in place.

## Tasks

- [x] Keep the repo tooling out of `drupal/` and `.ddev/`, before any Drupal
      files exist (see "Tooling" under Notes):
  - [x] `.gitignore`: an allowlist for `drupal/` (only custom modules,
        `settings.php`, config, content and the Composer files are tracked),
        plus `/.ddev/.env*`. `*.log*` narrowed to `*.log` and `*.log.*`.
  - [x] `.prettierignore` and `.oxfmtrc.json`: `/drupal/*` except
        `drupal/mocks.graphql`, and `/.ddev/`.
  - [x] `.oxlintrc.json`: `drupal/**`, `.ddev/**`.
  - [x] `css/index.css`: `@source not` for `drupal`, `.ddev` and
        `playground-drupal`.
  - [x] `vitest.config.ts`: the watcher ignores `drupal/` and `.ddev/`.
- [x] Add the submodule:
      `git submodule add -b 2.0.x https://git.drupalcode.org/project/paragraphs_blokkli.git drupal/paragraphs_blokkli`.
      Push URL (local only):
      `git -C drupal/paragraphs_blokkli remote set-url --push origin git@git.drupal.org:project/paragraphs_blokkli.git`.
- [x] `.ddev/config.yaml`, written by hand (`ddev config` would create settings
      files):
  - name `blokkli`, type `drupal11`, docroot `drupal/web`,
    `composer_root: drupal`, web `working_dir` `/var/www/html/drupal`
  - PHP 8.5, `nodejs_version: auto` (reads `.nvmrc`)
  - `omit_containers: [db]`, `disable_settings_management: true`
  - `post-start` hook: `composer install`
- [x] `.ddev/web-build/Dockerfile.bun`: bun in the web image, pinned to the
      `packageManager` version (1.3.14).
- [x] The `nuxt` daemon (`web_extra_daemons`) runs `.ddev/nuxt-daemon.sh`:
      `nuxi dev playground-drupal` on `127.0.0.1:3000`.
      `ddev nuxt [status|start|stop|restart|logs]` controls it.
- [x] `drupal/composer.json`: recommended-project 11.4 plus drush 13 and the
      Twig pin (F5 in [findings.md](findings.md)). Contrib modules come in
      chunk 03.
- [x] `.ddev/nginx_full/nginx-site.conf`, adapted from the starterkit's
      `nginx-site-local.conf.template`:
  - [x] an internal Drupal server (`127.0.0.1:8888`, PHP-FPM)
  - [x] a public `default_server` that sends everything to Nuxt, except the
        Drupal paths (anchored, with an optional language prefix)
  - [x] WebSocket upgrade for `/_nuxt/` (HMR) and `/api/blokkli/agent`
  - [x] 502 pages for Nuxt and for Drupal
  - [x] Works for any hostname, so chunk 08's subdomains need no nginx change.
- [x] `ddev check-routes`: requests a table of paths and checks which upstream
      answered (the `X-Blokkli-Upstream` header).
- [x] A minimal `playground-drupal/` (`nuxt.config.ts`, one page) so the daemon
      and routing can be checked. Chunk 06 builds it out.
- [x] All bun and node tooling runs in the web container (`ddev ssh`), as in the
      other ddev projects. Nothing is set up for running it on the host.

## Acceptance criteria

- On a clean clone, `git submodule update --init`, `ddev start` and
  `bun install` in the container produce a running site.
- Editing a file under `src/` hot-reloads the page at
  `https://blokkli.ddev.site` through nginx.
- Drupal paths (`/user/login`, `/graphql`, `/admin`) reach PHP; everything else
  reaches Nuxt.
- The mock playground (`bun run dev`) still works alongside.

## Notes

### Setup facts

- **Node tooling runs in the container**, like in the other ddev projects:
  `ddev ssh`, then `bun install`, `bun run …`. The generated `.nuxt` files
  therefore contain `/var/www/html` paths, as in the starterkit; the tsconfig
  files use relative paths, so editors on the host are fine.
  - A first version mounted the repo a second time at its host path, so that
    `.nuxt` would contain host paths for host-side typechecks. That needed the
    project to be registered at the resolved path (`~/Development` is a
    symlink), and ddev then refused `ddev start` from the usual path. Dropped:
    nothing runs on the host.
- **bun** comes from `.ddev/web-build/Dockerfile.bun`, pinned to the
  `packageManager` version instead of the starterkit's `bun@latest`. Bump both
  together. corepack isn't needed.
- **No `dev:drupal` package script.** The daemon starts `nuxi` itself, and
  `ddev nuxt` controls it.
- **The Nuxt daemon:**
  - ddev runs it as the supervisor program `webextradaemons:nuxt`, as the host
    user.
  - Its output goes to the container log without a prefix, so `nuxt-daemon.sh`
    also writes it to `/tmp/nuxt.log` for `ddev nuxt logs`.
  - When `node_modules` is missing, the script waits instead of exiting;
    supervisor would give up after 15 quick failures.
  - It listens on `127.0.0.1` only. Otherwise Vite (including `/@fs/`, which
    serves any file in the repo) would be reachable from other containers.
  - `vite.server.allowedHosts: true` in `playground-drupal/nuxt.config.ts` lets
    the requests from nginx through, whatever their Host.
- **HMR** needs no Nuxt config: `nuxi dev` serves the HMR WebSocket on the same
  port under `/_nuxt/`, and the client connects to
  `wss://blokkli.ddev.site/_nuxt/`.
- **ddev registration.** The project is registered at `~/Development/blokkli`.
  ddev keeps the path a project was first started from and refuses `ddev start`
  from a different spelling of it (e.g. `/mnt/Storage/development/blokkli`, the
  symlink's target). The stale `blokkli` registration of
  `~/Development/blokkli/drupal` has been removed; `ddev list` showed it as
  "drupal" only because its config was missing.
- **No db container.** `omit_containers: [db]` works with `type: drupal11`,
  including `ddev drush`. `ddev xhgui` isn't available without a database.
- **`drush status` shows `Site URI: http://default`.** ddev doesn't set
  `DRUSH_OPTIONS_URI` when settings management is off. Chunk 03 sets it.

### nginx

- **All `proxy_set_header` lines are at server level.** A location that sets any
  of its own inherits none of them. The starterkit's `/api/blokkli/agent`
  location did exactly that, and lost Host and `X-Forwarded-*` (F6 in
  [findings.md](findings.md)).
- **Host.**
  - Both upstreams get the host the browser asked for, as `Host` and as
    `X-Forwarded-Host`. It's `X-Forwarded-Host` if present, otherwise `Host`.
  - Behind the router that's the original host, and Traefik overwrites a
    client's own `X-Forwarded-Host` (tested).
  - For Nuxt's SSR requests to `http://127.0.0.1/…`, it's whatever Nuxt forwards
    (chunks 06 and 08).
- **Scheme.** The router sends http and https to port 80, so the scheme comes
  from `X-Forwarded-Proto`, normalised (`wss` → `https`). Drupal's `HTTPS` comes
  from the same header (`$fcgi_https` from ddev's `nginx.conf`), which is why an
  uninstalled Drupal already redirects to `https://…/core/install.php`.
- **The Drupal path list is anchored at a path segment**, so `/blockchain`,
  `/users` and `/media-kit` stay with Nuxt. The starterkit's regex isn't (F6).
  - It covers the top-level route prefixes of core's and `paragraphs_blokkli`'s
    routing files, plus the contrib modules chunk 03 adds (masquerade,
    scheduler, token, graphql).
  - Also routed to Drupal: `*.php`, `/.well-known/`, and the entity forms of
    `node` and `taxonomy/term`. The canonical `/node/1` goes to Nuxt.
- **ddev's own config parts that are gone:**
  - `include /etc/nginx/common.d/*.conf` (the xhprof UI)
  - `include /mnt/ddev_config/nginx/*.conf` (add-on snippets)
- **The healthcheck** (`/phpstatus` on port 80) is kept by including
  `/etc/nginx/monitoring.conf` in the public server.
- **The 502 pages** live in `.ddev/nginx_full/` and are served from
  `/mnt/ddev_config/nginx_full/`. nginx only loads `*.conf` from there, so the
  HTML files are harmless.

### Tooling

`bun run verify` starts with `format:fix` and `lint:fix`, which would have
written into Drupal files.

- **oxfmt** respects `.gitignore` but walks everything else, including hidden
  folders and the submodule.
  - It rewrites Drupal config YAML (`{  }` → `{}`, which fights `drush cex`),
    Drupal JS and markdown.
  - It mangles PHP in `.inc` files (parsed as HTML).
  - It aborts on a deliberately broken fixture in the module.
  - It also reads `.prettierignore`, which prunes whole folders.
- **oxlint `--fix`** would edit the submodule's JS.
- **The root `*.log*` rule** in `.gitignore` also matched `system.logging.yml`,
  `image.style.logo.yml` and `*.logger.yml`.
- **Tailwind** (`styles:build`) auto-detects sources from the working directory,
  i.e. the whole repo. Without the `@source not` lines, the published
  `output.css` would depend on whether the submodule is checked out. Verified:
  `output.css` is byte-identical before the change, after it, and with the
  submodule present.
- **Vitest watch mode** watches the repo root and ignores `.gitignore`.
  - The ignore uses absolute paths.
  - A `**/drupal/**` glob would also have matched `src/modules/drupal`.

### Follow-up, not fixed here

- The module's own Tailwind pass (`src/build/templates/definitions/styles.ts`,
  "Module Utilities") runs `@tailwindcss/postcss` with the working directory as
  its base, and auto-detection stays on.
  - It scans the whole consumer project.
  - In this repo, the mock playground's dev CSS now also picks up candidates
    from the Drupal files. That only adds CSS and is dev-only.
  - The real fix is `source(none)` plus explicit sources in the module. Diff the
    generated CSS when doing it.

### Verification (2026-09-26)

- `ddev start` and `ddev restart` from `~/Development/blokkli`: healthy, web
  container only. In the container: node v22.23.3, bun 1.3.14. `nginx -t`
  passes.
- `ddev check-routes`: all 33 paths reach the expected upstream. `/user/login`
  redirects to `https://blokkli.ddev.site/core/install.php` (Drupal isn't
  installed yet).
- Headers, checked with temporary echo endpoints on both upstreams:
  - through the router: `Host` is `blokkli.ddev.site`, proto `https`, `HTTPS=on`
  - a simulated SSR request with `X-Forwarded-Host: a1.blokkli.ddev.site`
    arrives with that Host
  - a client-sent `X-Forwarded-Host` is overwritten by the router
- HMR over `wss://blokkli.ddev.site/_nuxt/` (a Bun WebSocket client, like
  Vite's):
  - Editing the page sends an update.
  - So does editing `src/runtime/helpers/tw.ts` while the page imports it.
  - An idle socket stays open for 330 s.
- The 502 page shows when the daemon is stopped, and Drupal paths keep working.
- The mock playground (`bun run dev` on the host) runs alongside.
- `bun run verify`:
  - format, lint, `typecheck:build`, `typecheck:runtime`, `typecheck:server` and
    unit tests pass.
  - `typecheck:playground` fails, but that isn't caused by this chunk: `dist/`
    holds a full build from 2026-09-03 instead of the `dev:prepare` stub, and
    the mock playground mixes its types with `src/`.
  - E2E: 324 of 325 pass. `fragments/base.test.ts` fails deterministically
    because the `AsyncTest` fragment (added 2026-08-20) is missing from the
    test's list; not caused by this chunk either.
- The submodule stays clean after `verify`, and `output.css` is byte-identical
  to the baseline.
- Clean clone of `24dff0970` (`git clone --recurse-submodules`, a different
  project name in `.ddev/config.local.yaml`):
  - `ddev start` ran `composer install` through the `post-start` hook.
  - `bun install` in the container: the first run failed once with "Fail
    extracting tarball for @nuxt/devtools", and a rerun succeeded (looks
    transient). bun 1.3.14 leaves `bun.lock` unchanged.
  - The waiting daemon started Nuxt by itself once `node_modules` existed.
  - The page renders, `/user/login` redirects to the installer, all 33 routes
    pass, and `git status` stays clean.
