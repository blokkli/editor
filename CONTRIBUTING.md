# Contributing

## Two playgrounds

This repository has two apps to develop the editor in. They coexist; the mock
playground will be removed at some point.

- **The mock playground** (`playground/`) uses a mock adapter that keeps
  everything in local storage. It runs on the host, and the E2E suite runs
  against it.
- **The sandbox** (`sandbox/`) is a Drupal 11 site with
  [Paragraphs blökkli](https://www.drupal.org/project/paragraphs_blokkli)
  (`sandbox/drupal/`) and a Nuxt app that uses the Drupal adapter
  (`sandbox/frontend/`). Both run in [ddev](https://ddev.com), at
  https://blokkli.ddev.site. A second Nuxt app hands out copies of the site
  (`sandbox/control/`), at https://blokkli-control.ddev.site.

`node_modules` is shared between the host and the container. On Linux, that's
fine either way. On macOS, the native binaries only match the side that ran
`bun install`.

## The mock playground

```bash
bun install
bun run dev:prepare
bun run dev          # http://localhost:3000
```

## The sandbox

### Setup

1. Clone with the submodule:
   `git clone --recurse-submodules https://github.com/blokkli/editor.git`. In an
   existing clone: `git submodule update --init`. Composer symlinks
   `sandbox/drupal/paragraphs_blokkli` into the site, and the `composer install`
   in `ddev start` fails while it's empty.
2. `ddev start`
3. `ddev ssh`, then `bun install`. All bun and node tooling for this stack runs
   in the container. The first install sometimes fails with "Fail extracting
   tarball from @nuxt/devtools" (bun 1.3.14); run it again.
4. `ddev bake` installs the site from `sandbox/drupal/config/sync`, with the
   German and French interface translations from drupal.org, and seeds the
   content of `sandbox/drupal/content`. It takes about 20 seconds. The first
   install logs "Couldn't write .htaccess file" for `public://` once, which is
   harmless.
5. `ddev drush uli` prints a login link for the admin. The test users log in
   with `ddev drush uli --name="Anna Keller"` (editor), `Marc Brunner` (head of
   department, reviews), `Élodie Favre` (French translator) and `Jonas Weber`
   (restricted editor). Logged in, a page shows Drupal's toolbar and its tabs
   (Edit, Translate…) above it; Drupal renders everything with Gin, also the
   pages that aren't admin pages (the login, a user's page).
6. Visitors who aren't logged in get "This sandbox is private", on the dev site
   as in a sandbox. The link of "Preview (with smartphone)" lets them see that
   page. Only for them does Nuxt render on the server: to see real pages
   rendered that way, put `$settings['blokkli_playground_public'] = TRUE;` in
   `sandbox/drupal/web/sites/default/settings.local.php` (gitignored). Sandboxes
   ignore it.

### Content

The content is written in YAML in `sandbox/drupal/content`: pages as paragraph
trees, with a value per language. Its README describes the format.

- `ddev bake` replaces the site's database and media files. English is the
  original language of the content; `ddev bake --source=de` (or `fr`) makes
  German the original and English and French its translations.
- Each bake writes a template to
  `sandbox/drupal/sandboxes/_template/<language>`. `ddev reset` (or
  `ddev reset de`) restores the site from it in a moment, e.g. after testing
  something in the editor.
- To change the content, edit the files and run `ddev bake`. Content created in
  the editor isn't exported.

### Sandboxes

A sandbox is a copy of a template with its own database, files and logins, at
its own subdomain. The site without a subdomain is the dev site.

```bash
ddev drush blokkli-sandbox:create a1             # https://a1.blokkli.ddev.site
ddev drush blokkli-sandbox:create b2 --source=de # from the German template
ddev drush blokkli-sandbox:list
ddev drush blokkli-sandbox:delete a1
```

- Ids are lowercase letters and digits, 2 to 32. An id without a sandbox gets a
  static page.
- drush works on a sandbox with `--uri`, e.g.
  `ddev drush --uri=https://a1.blokkli.ddev.site uli` for a login link.
- A bake doesn't change existing sandboxes. Delete and create them again.

### The control app

https://blokkli-control.ddev.site is how visitors get a sandbox:

- **The claim page** (`/de`, `/fr`, `/en`) creates one and logs the visitor in
  as Anna Keller, in the home page's editor.
- **`/admin`** lists the sandboxes and makes invitation links. Each link creates
  one premium sandbox (7 days), without the captcha and the limits.
- **Every 5 minutes, it deletes expired sandboxes:** after 24 hours, or 2 hours
  without use. Only its own: those made with drush stay.

Locally, every request comes from the same address, so the limit of 3 claims an
hour applies to everyone. Its database is `sandbox/control/.data/`.

Both Nuxt apps run as ddev daemons and start on their own once `node_modules`
exists. Don't run `bun run dev` for them: use
`ddev nuxt [status|start|stop|restart|logs]` for the frontend, and
`ddev nuxt control …` for the control app.

Optional secrets go in `.ddev/.env.web` (gitignored). Run `ddev restart` after
changing them.

```bash
ddev dotenv set .ddev/.env.web --deepl-auth-key=…
ddev dotenv set .ddev/.env.web --nuxt-blokkli-agent-auth-secret=<random string>
ddev dotenv set .ddev/.env.web --nuxt-blokkli-agent-api-key=…
```

- The agent needs the auth secret. Without an API key, only its mock provider
  works.
- **The control app's settings** are all optional locally, and required when
  hosted:
  - `--nuxt-sandbox-login-secret` signs the sandbox logins.
  - `--nuxt-admin-password` protects `/admin`; without it, `/admin` is open.
  - `--nuxt-turnstile-secret-key` and `--nuxt-public-turnstile-site-key` add the
    captcha. Cloudflare's test keys work locally.
- Don't enter the DeepL key in Drupal's settings form: it would end up in the
  exported config.

### Where things live

| Path                                 | What                                                            |
| ------------------------------------ | --------------------------------------------------------------- |
| `sandbox/drupal/`                    | Composer root. `config/sync` is the config, `web/` the docroot. |
| `sandbox/drupal/paragraphs_blokkli/` | The Drupal module, a git submodule of the drupal.org repo.      |
| `sandbox/drupal/content/`            | The content that `ddev bake` seeds.                             |
| `sandbox/drupal/sandboxes/`          | Gitignored: the templates, and each sandbox's database.         |
| `sandbox/frontend/`                  | The Nuxt app.                                                   |
| `sandbox/control/`                   | The control app: the claim page, invitations, the cleanup.      |
| `build/drupal-schema.graphql`        | The site's GraphQL schema. Generated, never edited by hand.     |
| `.ddev/`                             | nginx routing, the Nuxt daemons, `ddev nuxt`, `bake`, `reset`.  |
| `plans/drupal-setup/`                | The plan for this setup and the public sandbox.                 |

### A feature across both repositories

1. Change the module in `sandbox/drupal/paragraphs_blokkli`. It's symlinked into
   the site, so changes are live. After PHP changes, run `ddev drush cr`.
2. `bun run drupal:schema` (in the container) rebuilds Drupal's caches and dumps
   the schema into `build/drupal-schema.graphql`. The Nuxt daemon restarts and
   detects the available features again.
3. `bun run dev:prepare` regenerates the types for the Drupal module in `src/`.
   It also rewrites `playground/app/options-schema.json` with English labels;
   don't commit that.
4. Change the adapter and the UI in `src/`. The sandbox's Nuxt app hot-reloads.
5. Export config changes with `ddev drush cex -y` and commit
   `sandbox/drupal/config/sync`.
6. Run `bun run verify`, and the module's checks (see below). After nginx
   changes, also `ddev check-routes`.
7. Commit the module change in the submodule and push it to drupal.org. Then
   commit the new submodule pointer here.

### The submodule

- `git submodule update` leaves the module on a detached HEAD. Before committing
  in it, switch to a branch:
  `git -C sandbox/drupal/paragraphs_blokkli switch 2.0.x` (or a feature branch).
- `.gitmodules` uses the https URL, so cloning needs no drupal.org account.
  Pushing needs SSH:
  `git config --global url."git@git.drupal.org:".pushInsteadOf "https://git.drupalcode.org/"`.
- Don't run `git submodule update` from hooks or scripts: it would detach the
  branch someone is working on.
- The module has its own `.ddev` (project `paragraphs-blokkli`). ddev commands
  run inside `sandbox/drupal/paragraphs_blokkli` target that project, not this
  one.
- **The module's tests and checks** run in that project. In
  `sandbox/drupal/paragraphs_blokkli`:
  1. `ddev start`, `ddev poser`, then `ddev symlink-project`. This builds a test
     site into the checkout's `web/` and `vendor/`, which are gitignored there.
  2. `ddev phpunit-parallel` runs the whole suite in about 20 seconds.
     `ddev phpunit --filter …` runs single tests. `ddev phpcs` and
     `ddev phpstan` use the module's own configuration, as on drupal.org.
  - This site's Drupal and phpstan skip directories named `web`: settings.php
    sets `file_scan_ignore_directories`, and phpstan-drupal is patched.
  - ddev gives a project name to one checkout only. If another checkout of the
    module already uses `paragraphs-blokkli`, set another name in
    `.ddev/config.local.yaml` (gitignored), e.g.
    `name: paragraphs-blokkli-sandbox`. The module's folder in the test site
    takes that name too.

## Checks

- `bun run verify` runs the formatters, the linters, all typechecks and the unit
  tests. It works on the host and in the container. The typechecks of the
  sandbox's apps need the `.nuxt` folders that their daemons generate, and are
  skipped without them.
- `bun run verify -- e2e` runs the E2E suite against the mock playground on
  `localhost:3000`, on the host.
