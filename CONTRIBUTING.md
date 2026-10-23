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
4. Still in the container: `bun run dev:prepare` and `bun run styles:build`,
   then `ddev nuxt restart` (on the host). The frontend uses blökkli from
   source, which needs the root `.nuxt/` (without it: "Failed to load tsconfig
   '.nuxt/tsconfig.app.json'") and the compiled editor CSS
   `src/runtime/editor/css/output.css` (without it: "ENOENT … output.css"). Both
   are gitignored. Revert the change `dev:prepare` makes to
   `playground/app/options-schema.json`.
5. `ddev bake` installs the site from `sandbox/drupal/config/sync`, with the
   German and French interface translations from drupal.org, and seeds the
   content of `sandbox/drupal/content`. It takes about 20 seconds. The first
   install logs "Couldn't write .htaccess file" for `public://` once, which is
   harmless.
6. `ddev drush uli` prints a login link for the admin. The test users log in
   with `ddev drush uli --name="Anna Keller"` (editor), `Marc Brunner` (head of
   department, reviews), `Élodie Favre` (French translator) and `Jonas Weber`
   (restricted editor: no new sections, and he may not add, change or delete
   charts). Logged in, a page shows Drupal's toolbar and its tabs (Edit,
   Translate…) above it; Drupal renders everything with Gin, also the pages that
   aren't admin pages (the login, a user's page).
7. Visitors who aren't logged in get "This sandbox is private", on the dev site
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
ddev drush blokkli-sandbox:update a1             # drush deploy on its site
ddev drush blokkli-sandbox:delete a1
```

- Ids are lowercase letters and digits, 2 to 32. An id without a sandbox gets a
  static page.
- drush works on a sandbox with `--uri`, e.g.
  `ddev drush --uri=https://a1.blokkli.ddev.site uli` for a login link.
- A bake doesn't change existing sandboxes. Delete and create them again.
- A claimed sandbox has a "Sandbox" button next to Drupal's tabs above its
  pages. Its popup says when the sandbox is deleted, with a link back to it,
  links for colleagues and a link to the welcome page. One made with drush has
  no button, unless it gets the control app's limits:
  `ddev drush blokkli-sandbox:create a1 --expires=$(($(date +%s) + 86400)) --idle=7200`.
  It still doesn't expire.
- Only premium sandboxes have the agent: those from an invitation, and those
  made with `--premium` (e.g. `ddev drush blokkli-sandbox:create a1 --premium`).
  The others get no agent secret, so the editor hides the agent.

### The control app

https://blokkli-control.ddev.site is how visitors get a sandbox:

- **The claim page** (`/de`, `/fr`, `/en`) creates one and logs the visitor in
  as Anna Keller. The page's language is the content's. They land on the welcome
  page in that language (`/en/welcome`, `/de/willkommen`, `/fr/bienvenue`):
  tasks to try, each a link into an editor. A language needs its template
  (`ddev bake --source=…`).
- **`/admin`** lists the sandboxes and makes invitation links. Each link creates
  one premium sandbox (21 days, with the agent), without the captcha and the
  limits.
- **Access links** (`/access/<token>`, made and revoked in `/admin`) log into a
  premium sandbox as one of its test users, as often as needed and in any
  browser: to come back, or for colleagues. Every invitation's sandbox gets one
  for Anna Keller. They end when revoked or when the sandbox is deleted.
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

- **The agent** needs both: the auth secret, which Drupal and Nuxt share, and an
  API key. Without the key, it only replays scripts (its mock provider, for the
  E2E tests); typing to it fails. Give the key a spend limit at the provider.
- **The control app's settings** are all optional locally, and required when
  hosted:
  - `--nuxt-sandbox-login-secret` signs the sandbox logins.
  - `--nuxt-admin-password` protects `/admin`; without it, `/admin` is open.
  - `--nuxt-turnstile-secret-key` and `--nuxt-public-turnstile-site-key` add the
    captcha. Cloudflare's test keys work locally.
- Don't enter the DeepL key in Drupal's settings form: it would end up in the
  exported config. The form shows the placeholder that the config stores
  (`overridden-at-runtime`); the key comes from the environment.

### Hosting

The same ddev project runs on a server, for internal use. There,
`.ddev/config.local.yaml` (gitignored) makes it the hosted instance:

```yaml
project_tld: sandbox.example.com # the hosted domain
web_environment:
  - IS_DDEV_HOSTED=true
```

- **The hosts** are the local ones under that domain: `blokkli-control.<domain>`
  (the claim page), `<id>.blokkli.<domain>` (the sandboxes) and
  `blokkli.<domain>`, which leads to the claim page. DNS and the certificate
  need `*.<domain>` and `*.blokkli.<domain>`.
- **The secrets** go in `.ddev/.env.web`, as locally. `DRUPAL_HASH_SALT`,
  `NUXT_SANDBOX_LOGIN_SECRET` and `NUXT_ADMIN_PASSWORD` are required: Drupal
  refuses to run without the first two. Give the agent's API key a spend limit,
  and don't set the Rokka keys.
- **`ddev deploy`** updates the code, builds both Nuxt apps for production,
  bakes the templates and restarts. The premium sandboxes that the control app's
  cleanup keeps stay, with their content and files:
  `drush blokkli-sandbox:update` runs `drush deploy` on each (database updates
  and config import). Every other sandbox is deleted
  (`sandbox/control/scripts/deploy-sandboxes.ts`). A failed update stops the
  deploy. The running apps keep serving until the new builds are swapped in, so
  a failed build or bake leaves them running. Run it again every week or so: the
  seeded dates are relative to the bake. A premium sandbox keeps the content it
  was created with. It refuses to run locally.
- **GitHub deploys `dev`** (`.github/workflows/ci.yml`): every push and pull
  request runs the gates (`bun run verify -- ci`), the production build, a bake
  and the E2E tests. They run against an E2E build of the frontend, a production
  build with the agent's mock that is never deployed. A push to `dev` that
  passes them deploys, unless it only changes `plans/`, `docs/`, `skills/`,
  `.claude/` or `test/`. A rewritten `dev` (an amend, a rebase) is deployed too:
  the server resets its checkout to it. Push the module's commits to drupal.org
  first: the checkout fetches them from there.
- Hosted, the Nuxt apps run their production builds (never the dev servers,
  which serve any file of the repository), nginx doesn't serve the dev site, and
  only Nuxt's server reaches Drupal's GraphQL endpoint.
- What the server needs besides that (the VM, the firewall, certificates, the
  outgoing allowlist, monitoring): `plans/drupal-setup/12-hosted-deploy.md`.

### The agent

The agent is on the dev site and in premium sandboxes (see Sandboxes). All four
test users can use it. Drupal checks each change against the user's role, so
Jonas's agent is as restricted as he is.

The demo's own skills, tool and prompts are in `sandbox/frontend/blokkli/`, not
in `app/`: the agent module only looks next to `nuxt.config.ts`.

- **Skills:** how the town's pages are built, and its writing rules in each
  language.
- **The tool `get_town_data`:** the fees and statistics, so the agent doesn't
  invent numbers.
- **Prompts:** "Write a service page", "Check the style guide" and "Link related
  pages".

Their DE and FR strings are in `translations` in `nuxt.config.ts`.

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
| `plans/drupal-setup/`                | What's still open: the hosted deploy, upstream findings.        |

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
- `bun run verify -- e2e-drupal` runs the E2E tests in `test/e2e-drupal/`
  against sandboxes of the ddev site, on the host. They bake their own template
  from `test/e2e-drupal/content` the first time and whenever it changes. Neither
  DeepL nor the agent's model is called: DeepL is a fake there, and the agent
  replays a script.
