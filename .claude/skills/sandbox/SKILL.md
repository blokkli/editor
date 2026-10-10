---
description:
  How the sandbox stack (sandbox/, .ddev/) is set up and how to work in it — the
  Drupal site, its Nuxt app, the control app, sandboxes, bakes, routing, logins,
  secrets and the E2E sandboxes. Use when working on anything under sandbox/ or
  .ddev/, or when a sandbox, a claim, a bake, a daemon or the routing
  misbehaves.
---

# The sandbox

One ddev project (`blokkli`) runs three things:

| What                                                      | Where                               | Code                                   |
| --------------------------------------------------------- | ----------------------------------- | -------------------------------------- |
| The dev site: Drupal 11 and its Nuxt app (one origin)     | `https://blokkli.ddev.site`         | `sandbox/drupal/`, `sandbox/frontend/` |
| Sandboxes: copies of a baked template, sharing all code   | `https://<id>.blokkli.ddev.site`    | the same                               |
| The control app: the claim page, invitations, the cleanup | `https://blokkli-control.ddev.site` | `sandbox/control/`                     |

The content is a fictional Swiss town, Blockingen (Bloquens in French), in
English, German and French. Any of the three can be the content's original
language.

## Ground rules

- **Node tooling runs in the container:**
  `ddev exec -d /var/www/html bun run …`. Drush: `ddev drush …` (the dev site)
  or `ddev drush --uri=https://<id>.blokkli.ddev.site …`.
- **Both Nuxt apps are ddev daemons.** Never start them.
  `ddev nuxt [control] status|start|stop|restart|logs`; read logs with
  `timeout 8 ddev nuxt logs`.
- **If the checkout is reachable through a symlink,** run `ddev start`/`restart`
  from the path ddev registered (`ddev list`); from the other path the site
  stays down.
- **Secrets live only in `.ddev/.env.web`** (gitignored), set with
  `ddev dotenv set .ddev/.env.web --<name>=…`, then `ddev restart`. Never read
  that file, never put a secret into Drupal config (no key in a settings form:
  it would be exported).
- **Never edit generated files by hand:** `build/drupal-schema.graphql`,
  `sandbox/drupal/blokkli-options-schema.json`,
  `sandbox/drupal/config/sync/frontend_routing.settings.yml`,
  `sandbox/frontend/app/graphql/fragment.easyTexts.graphql`.
- **The submodule** `sandbox/drupal/paragraphs_blokkli` is drupal.org's
  repository. No commits or pushes there unless asked; never
  `git submodule update` (it detaches the branch being worked on).
- **Content is code** (`sandbox/drupal/content`). What's done in the editor
  isn't exported; change the YAML and bake.
- **Anonymous access to the dev site is opt-in and local only:**
  `$settings['blokkli_playground_public'] = TRUE;` in the gitignored
  `settings.local.php`. Never in `config/sync`.

## Map

| Path                                            | What                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `.ddev/config.yaml`                             | Hostnames, the two daemons, SQLite (no db container), `composer install` on start                            |
| `.ddev/nginx_full/`                             | `nginx-site.conf` (all routing), `proxy.inc`, `headers.inc` (CSP), the 502 and "unknown sandbox" pages       |
| `.ddev/commands/web/{bake,bake-e2e,reset,nuxt}` | Container commands                                                                                           |
| `.ddev/commands/host/check-routes`              | The routing test table (also read by a unit test)                                                            |
| `.ddev/nuxt-daemon.sh`                          | Runs `nuxi dev sandbox/<app>` on 127.0.0.1:3000 (frontend) or :3001 (control), logs to `/tmp/nuxt-<app>.log` |
| `sandbox/drupal/`                               | Composer root; `web/` docroot, `config/sync`, `content/`, `patches/`                                         |
| `sandbox/drupal/web/modules/custom/`            | `blokkli_sandbox`, `blokkli_playground`                                                                      |
| `sandbox/drupal/db/site.sqlite`                 | The dev site's database (gitignored)                                                                         |
| `sandbox/drupal/sandboxes/`                     | Gitignored: `_template/<lang>/`, `_template/e2e/` and one directory per sandbox                              |
| `test/e2e-drupal/`                              | The E2E tests against sandboxes: specs, `support/`, fixtures in `content/`                                   |
| `sandbox/frontend/`                             | The Nuxt app; `blokkli/` holds the agent's skills, tool and prompts                                          |
| `sandbox/control/`                              | The control app; its database is `sandbox/control/.data/control.sqlite`                                      |
| `build/drupal-schema.graphql`                   | The site's GraphQL schema, shared by the root config and the frontend                                        |

Neither Nuxt app has a `package.json`: both use the repo root's `node_modules`.

## Requests

Traefik sends every hostname to the web container's nginx on port 80.

- **The public server** (every host but the control app's):
  - Drupal paths go to an internal nginx server on `127.0.0.1:8888` (PHP-FPM): a
    first path segment from a fixed list (`admin`, `user`, `graphql`,
    `paragraphs_blokkli`, `media`, `system`, `sites`, `core`, `blokkli-sandbox`,
    …), with an optional `/en|/de|/fr` prefix and anchored to a whole segment;
    the entity forms (`/node/add`,
    `/node/<n>/edit|delete|revisions|translations|usage`, the same for
    `taxonomy/term`); `*.php` and `/.well-known/`.
  - Everything else goes to the frontend on `:3000`: pages, `/_nuxt/` (HMR) and
    `/api/blokkli/agent` (the agent's WebSocket, 1-day timeouts).
  - Canonical entity pages (`/node/1`) are Nuxt's. An alias that starts with one
    of Drupal's segments isn't: a page "Comments" at `/en/comments` shows
    Drupal's page, without the editor.
- **The control host** sends every path to `:3001`, Drupal's included.
- **Sandbox hosts:** a map turns `<id>.blokkli.ddev.site` into the id. Without
  `sandboxes/<id>/db.sqlite`, nginx answers 410 with `sandbox-unknown.html`
  (links to the claim page). A sandbox's public files are served only on its own
  host.
- **Every response** has `X-Blokkli-Upstream` (`nuxt`, `drupal`, `control`,
  `nginx`, `sandbox-unknown`) and the CSP from `headers.inc`
  (`connect-src 'self'`, which covers the WebSockets).
- **Adding a Drupal path** means three places: the regex in `nginx-site.conf`,
  `sandbox/frontend/app/utils/drupalPath.ts` (`SiteLink` uses it to leave the
  SPA), and the table in `check-routes`. `test/unit/drupal-path.test.ts`
  compares the last two. Then run `ddev check-routes` (on the host).
- **Nuxt's server calls Drupal through nginx:** `runtimeConfig.drupalUrl` is
  `http://127.0.0.1`, the endpoint `/<lang>/graphql`, with the browser's cookie
  and `X-Forwarded-*` headers (`shared/utils/request.ts`). nginx makes
  `X-Forwarded-Host` the `Host`, so Drupal resolves the same sandbox.
- **SSR only for anonymous visitors, and only locally**
  (`sandbox/frontend/server/middleware/spa.ts`): a session cookie,
  `blokkliEditing`/`blokkliPreview` in the URL, or `IS_DDEV_HOSTED=true` gets
  the SPA.

## Drupal

- **Installed from config,** without a profile:
  `drush site:install --existing-config` (part of the bake). SQLite everywhere,
  `PRAGMA synchronous=NORMAL`, the entity cache in memory.
- **Languages:** en (Drupal's default), de, fr, each with a path prefix. The
  GraphQL request's language comes first in negotiation
  (`language-graphql-operation`), then the URL. Time zone Europe/Zurich.
- **Theme:** Gin for everything Drupal renders (admin and the login). The
  frontend shows Drupal's toolbar and local tasks through vuepal.
- **Hosts** (`paragraphs_blokkli.settings.yml`, `enabled_types`): the node types
  `editorial` (editorial page), `page` (detail page), `news`, `event`, `office`,
  `publication`, and the config pages `footer` and `site`
  (`translatable_config_pages`). The front page is `/node/1`, an editorial page.
- **Pasted text** (`paragraphs_blokkli.settings`, `clipboard_text_paragraphs`)
  becomes a text or a title. The editor offers only the types whose field can
  hold it: a text longer than a title's 255 characters becomes a text without
  asking.
- **Block options** are validated against
  `sandbox/drupal/blokkli-options-schema.json` (`schema_file`), which the
  frontend's build writes (`schemaOptionsPath`). After changing a block's
  options: `ddev nuxt restart` regenerates it; commit it.
- **The GraphQL server** `graphql` (`core_composable` schema, `/graphql`).
  Custom fields come from the modules' schema extensions.
- **Roles and test users** (`content/users.yml`, no passwords:
  `ddev drush uli --name="Anna Keller"`; `ddev drush uli` is the admin, uid 1):

  | User         | Role                                 | Can                                                             |
  | ------------ | ------------------------------------ | --------------------------------------------------------------- |
  | Anna Keller  | `content_editor` ("Editor")          | everything editorial, templates, library, scheduling, the agent |
  | Marc Brunner | `reviewer` ("Head of department")    | view, comment, review; no editing                               |
  | Élodie Favre | `translator` ("Translator (French)") | translate, edit translations; can't take over an edit state     |
  | Jonas Weber  | `restricted_editor`                  | edit, but not charts, and can't add or delete sections          |

  All four have `view any unpublished content` (contrib `view_unpublished`) and
  `use paragraphs blokkli agent`. The two editor roles may export and import
  paragraphs (`transfer blokkli paragraphs`). Élodie can't take over an edit
  state: it covers every language, so she would take over the editors'
  unfinished changes.

- **Access:** the anonymous role only has `view media`, so a site is private
  ("This sandbox is private", `app/error.vue`). `blokkli_playground`'s
  `AnonymousViewerAccessPolicy` lets anonymous visitors in while their session
  has a valid preview grant ("Preview on smartphone"), or when the local
  `blokkli_playground_public` flag is set (ignored in sandboxes).
- **Composer:** `paragraphs_blokkli` comes from the submodule through a path
  repository (symlinked to `web/modules/contrib/paragraphs_blokkli`). Patches
  are in `sandbox/drupal/patches/` and `composer.json`
  (`composer-exit-on-patch-failure`).

### blokkli_sandbox

- `SandboxManager` and the drush commands
  `blokkli-sandbox:create <id> [--source=en|de|fr] [--expires=<unix>] [--idle=<seconds>] [--premium]`,
  `:delete <id>`, `:list`. They run on the dev site.
- `/blokkli-sandbox/login/{token}` (`SandboxLoginController`): verifies the
  token (`LoginToken`), logs the user in, redirects to the front page's editor
  (`/<lang>?blokkliEditing=<uuid>`) or to `?destination=`.
- `LastUseSubscriber` touches `sandboxes/<id>/last-use` at most once a minute;
  the control app reads its mtime.
- `UploadQuotaSubscriber`: 100 MB of uploads per sandbox.
- GraphQL `Query.sandbox` (`expires`, `idleLifetime`, `logins`): null for
  anonymous users, on the dev site, and in sandboxes without an expiry.
- A route for image style derivatives under a sandbox's files, so a new sandbox
  serves derivatives without rebuilding its router.
- Session cookies are host-only (`BlokkliSandboxServiceProvider`), so the dev
  site's login doesn't reach sandboxes.

### blokkli_playground

- Drush `blokkli-playground:seed [--source] [--content]` (refuses when nodes
  exist; rebuilds node access at the end) and
  `blokkli-playground:template <dir>` (image derivatives, router, a GraphQL
  warm-up, then `VACUUM INTO <dir>/db.sqlite`, switched to WAL mode: otherwise
  the first parallel requests to a fresh copy race to switch it, and the losers
  fail with "database is locked").
- The access policy above; class-based hooks (`src/Hook`): previews of
  unpublished entities, menu access, an event's `unpublish_on` from its date.
- Editor plugins: conversions (link → text, text ↔ title) and the transform
  "search and replace".
- What's rendered differs from what's stored, as on real sites; the agent's
  `processed-text` E2E tests rely on it:
  - A text filter on `basic_html`, after `filter_html` (which would remove its
    output): every http(s) link gets `target="_blank"` and a visually hidden
    "(opens in a new tab)" after it (`.visually-hidden` in `.rich-text`).
  - Swiss spelling: titles and leads (`fieldTitle`, `fieldLead` of every
    paragraph and node type) are resolved with "ss" for "ß"
    (`SwissSpellingExtension`, resolvers on the interfaces `Paragraph` and
    `Node`). The stored value keeps its "ß".
- Search: a Search API processor that indexes paragraph text (library items
  included) and `Query.search(text, offset, limit)`.
- Moves the config pages' canonical route to `/blokkli/config-page/{id}`.
- `tests/modules/blokkli_playground_test`, only in E2E sandboxes (`bake-e2e`
  installs it): allows the widget on pages, fakes YouTube and Vimeo, and adds
  the roles `comment_reader` (a reviewer who may read comments but not post
  them) and `comment_administrator` (one who administers comments).

## Sandboxes

On disk:

```
sandbox/drupal/sandboxes/_template/<lang>/   db.sqlite, files/{media,media-icons,styles}
sandbox/drupal/sandboxes/<id>/               db.sqlite, private/, tmp/, lifetime.json, last-use, e2e
sandbox/drupal/web/sites/default/files/sandboxes/<id>/   its public files
```

- **settings.php decides the site from the host:** a host that ends in one of
  `DDEV_HOSTNAME`'s wildcards (`*.blokkli.ddev.site`) is a sandbox. Its id must
  match `/^[a-z0-9]{2,32}$/` (as in nginx) and its `db.sqlite` must exist,
  otherwise settings.php throws. A sandbox gets its own database, files, private
  and temp directories, hash salt (`hash_hmac(id, DRUPAL_HASH_SALT)`) and
  trusted host. The cache bins `bootstrap`, `config`, `discovery` and `routes`
  use the database instead of APCu, which would grow with every sandbox; APCu's
  prefix is shared, so the class loader and file cache exist once for all sites.
  Compiled Twig and CSS/JS aggregates are the dev site's.
- **Creating** copies the template's files, creates `private/` and `tmp/`,
  writes `lifetime.json` when there's an expiry or `--premium`, and copies the
  database last (`.tmp`, then a rename): an existing `db.sqlite` means a
  complete sandbox. **Deleting** removes `db.sqlite` first.
- **`lifetime.json`** (`{expires, idle, premium}`) is for Drupal: the `sandbox`
  query (the "Sandbox" button) and the agent. The agent's secret is only set on
  the dev site and in sandboxes with `"premium": true`; without it,
  `paragraphsBlokkliAvailableFeatures.agent` is false and the editor hides the
  agent.
- **Drush-made sandboxes never expire:** only the control app deletes, and only
  its own. They show no "Sandbox" button unless created with `--expires` (e.g.
  `--expires=$(($(date +%s) + 86400)) --idle=7200`).
- **Every database caches the container and the router.** After changing
  services or routes: `ddev drush cr` (dev site), the same with `--uri` for a
  sandbox, and a bake so that new sandboxes get it.
- **Logins** are `<payload>.<signature>`: base64url JSON
  `{sandbox, user, expires}` and base64url HMAC-SHA256 with
  `NUXT_SANDBOX_LOGIN_SECRET`. The control app makes them
  (`server/utils/loginToken.ts`), Drupal checks them (`LoginToken.php`): the
  signature, the sandbox id, the expiry. The control app's are valid for 5
  minutes.

## Bake and reset

`ddev bake [--source=en|de|fr]` (about 25 s):

1. deletes the dev site's database and media files;
2. `drush site:install --existing-config` (with the interface translations);
3. `drush blokkli-playground:seed --source=<lang>`;
4. `drush search-api:index`, `drush cr`;
5. `drush blokkli-playground:template sandboxes/_template/<lang>` and copies the
   media files into the template.

- `--source` is the content's original language; the others become translations.
  The control app offers exactly the languages with a template.
- The dev site keeps the last bake. `ddev reset [en|de|fr]` (default `en`)
  copies a template back in milliseconds: use it after trying things in the
  editor.
- A bake changes no existing sandbox: delete and create it again.
- Bake after changing config, content or `blokkli_sandbox`/`blokkli_playground`,
  every language with a template: `ddev bake`, `ddev bake --source=fr`, then
  `ddev bake --source=de` (or `ddev reset de`) to leave German on the dev site.

## Content

YAML in `sandbox/drupal/content` (format: its `README.md`): users, media, terms,
library items, `nodes/<key>.yml`, templates, config pages, menus, comment
threads, `texts.csv` (the frontend's UI strings).

- Everything is validated before anything is written; one transaction.
- Text is a map per language; a missing language falls back to the source.
- Dates can be relative to the bake. `outdated: [fr]` flags a translation.
- Block options go into `options:`, as stored by blökkli.
- **UUIDs are UUIDv5 of the keys** (`node:<key>`, `paragraph:<key>`, …), stable
  across bakes. The welcome page's query uses them: renaming a key breaks it.
- `nodes/home.yml` is node 1, the front page.

## E2E tests

`test/e2e-drupal/` drives the editor against sandboxes of this site, on the
host, with ddev running: `bun run test:e2e-drupal` or
`bun run verify -- e2e-drupal`. Writing specs: the `e2e-testing` skill.

- **The template `_template/e2e`** comes from config and the fixtures in
  `test/e2e-drupal/content` (the seed format), not from
  `sandbox/drupal/content`. `ddev bake-e2e` installs into a scratch sandbox
  (`e2ebake`), so the dev site stays as it is. vitest's global setup bakes when
  its fingerprint changes: config, the seed code, the fixtures, the fakes,
  `bake-e2e`, the dumped GraphQL schema (the template caches it), and the date
  (seeded dates are relative to the bake). About 16 s.
- **One sandbox per vitest worker:** `e2e1`, `e2e2`, … (`VITEST_POOL_ID`).
  `resetSandbox()` makes it a fresh copy of the template in about 20 ms: plain
  file copies on the host, the database last. Each spec file resets in
  `beforeAll`. The sandboxes stay after a run, to look at a failure:
  `ddev drush --uri=https://e2e1.blokkli.ddev.site uli`.
- **A reset ends the sessions** (they're in the database). Specs log in with a
  token signed like the control app's (`loginPath()`).
- **The marker file `e2e`**, written by the reset, makes an E2E sandbox for
  settings.php: it discovers test modules (`extension_discovery_scan_tests`) and
  never gets DeepL's key. The reset also writes `lifetime.json` with
  `"premium": true`, for the agent.
- **No real requests:**
  - DeepL: the template has `paragraphs_blokkli_deepl_test` (in the submodule)
    enabled. Its client never reaches DeepL: a text comes back as `[FR] <text>`,
    and one containing `[deepl-error]` fails the request.
  - The agent: `openEditor()` always gives it a mock script, an empty one by
    default. Then neither the conversation, the routing nor the field edit
    stream calls the model (the `agent-e2e-testing` skill). A spec of the
    conversation restore uses a script too, with a `restore` entry.
  - YouTube and Vimeo: `blokkli_playground_test`'s `VideoFake`, an `http_client`
    middleware, answers the requests of a remote video: oEmbed's providers list,
    the video's data ("A video on YouTube", always) and its thumbnail.
- **The widget** (`widget`) is a paragraph type for the tests: an option of
  every type and the field combinations the demo has no use for. Its config and
  component are part of the site (the frontend is one build), but no field
  allows it, so only E2E sandboxes have widgets (`blokkli_playground_test`).
- **The fixtures are the tests' own:** users (one per role, and a second content
  editor, all with an English UI), config pages, menus and nodes. A paragraph a
  spec refers to gets a `key`; its UUID is `seedUuid('paragraph', key)`. Content
  the site doesn't allow is marked `invalid: true` (see the content README):
  `nodes/broken.yml` has a title in a gallery. Users and nodes marked
  `deleted: true` are deleted after seeding: Nora Huber's comment has no author,
  the notification about `nodes/removed.yml` no page.
- **They run against the dev server** (`ddev nuxt`), which has the Test Cases
  sidebar, and typecheck with the frontend: `typecheck:sandbox-frontend` covers
  `test/e2e-drupal/`.

## The control app (`sandbox/control/`)

- **`/`** redirects by `Accept-Language` to `/de`, `/fr` or `/en` (German by
  default), keeping `?invitation=`.
- **The claim page** (`app/pages/[lang].vue`): its language is also the
  content's; languages without a template are disabled. It posts
  `{ source, invitation, turnstile }` to `/api/claim` and follows the URL it
  gets.
- **`/api/claim`:**
  1. checks the source;
  2. checks Turnstile (unless there's an invitation, or no secret);
  3. with an invitation, uses it up (410 if used); without one, applies 3 claims
     per IP and hour (an HMAC of the IP; locally everyone shares one address)
     and at most 100 active normal sandboxes;
  4. inserts the row before copying (node:sqlite is synchronous, so parallel
     claims see each other);
  5. runs `drush blokkli-sandbox:create <random 10-char id> --source=…` with
     `--expires` and `--idle=7200` (24 h, 2 h idle) or `--premium` (7 days);
  6. returns a login URL for Anna Keller with
     `?destination=<welcome page in the source language>`. Errors carry a code
     (`shared/utils/claim.ts`) that the page translates.
- **`/admin`** (basic auth with `NUXT_ADMIN_PASSWORD`; open locally without one,
  503 when hosted): the sandboxes and the invitations; makes invitation links
  (`/?invitation=<token>`), each good for one premium sandbox.
- **The task `sandbox:cleanup`** runs every 5 minutes: it deletes sandboxes past
  `min(created + 24 h, last use + 2 h)` (premium: created + 7 days) and marks
  rows of sandboxes that are gone. Rows are never removed.
- It reuses the frontend's stylesheet (its `main.css` imports the frontend's and
  adds the `Logo` folder as a Tailwind `@source`), the `Logo`, and
  `shared/utils/{languages,welcome}.ts`, by relative path.

## The frontend (`sandbox/frontend/`)

- **blökkli comes from source** (`../../src/module`, its sub-modules from
  `../../src/modules/*`): changes in `src/` hot-reload here. Module order
  matters: graphql-middleware before blökkli, vuepal before
  language-negotiation.
- **Auto-imports are on** (as in a consumer project). Helpers go into
  `app/utils/`, code shared with the server into `shared/utils/`, never next to
  a component (Nuxt registers every file in `app/components/` as a component).
  Still imported: types, npm packages, `#blokkli/...`, and components used as
  values (`:is`).
- **Routing:**
  - `pages/[...slug].vue` runs the `route` query and renders `Node<Bundle>` by
    `__typename`; `pages/index.vue` is the front page (`HomeHero` and the
    editorial page).
  - Overviews and search (`events`, `news`, `publications`, `search`) are
    frontend routes: `definePageMeta` with `languageMapping` and
    `drupalFrontendRoute`. vuepal writes their paths into
    `config/sync/frontend_routing.settings.yml`; Drupal locks their nodes'
    aliases. Commit that file.
  - `welcome.vue` (`/en/welcome`, `/de/willkommen`, `/fr/bienvenue`) is
    Nuxt-only: its texts are in `app/utils/welcomeTexts.ts`, its paths also in
    `shared/utils/welcome.ts` (the control app's redirect target).
  - `/<lang>/design-system` documents the design system, with mockups.
  - `blokkli/template/[uuid]` and `blokkli/library-item/[uuid]` edit templates
    and library items; `embed/fee-calculator` is embedded in a page.
  - `layouts/drupal.vue`: the toolbar (vuepal), the local tasks and the
    "Sandbox" button (`SandboxInfo`, shown when the `sandbox` query isn't null),
    the header (`ConfigPageSite`) and footer (`ConfigPageFooter`), both editable
    config pages, from the `layout` query.
- **Hosts** (`components/Node/*`): each wraps its fields in `BlokkliProvider`.
  The detail page (`Node/Page`) has the sidebar layout: main field, the office's
  contact, related topics (`field-list-type="related"`), and an aside with the
  table of contents and `field_aside` (`sidebar`). The table of contents lists
  the titles of the main field whose option "In the table of contents" is on; a
  heading's id is its title's "Anchor" option, or else its title as a slug
  (`anchorId()`). The site config's fields use the field list types `notice`,
  `service` and `quick_links`, the footer's `footer`.
- **Paragraphs** (`components/Paragraph/<Bundle>/index.vue`, found by the drupal
  module's default pattern): `defineBlokkli`, a `fragment.graphql` next to it,
  variants with `renderFor` per field list type or parent (e.g.
  `Title/Sidebar.vue`, `Link/InList.vue`). Fragments
  (`Paragraph/BlokkliFragment/*`) must be allowed by name on the field
  (`allowed-fragments`): `today` and `quick_links` on the front page,
  `office_pages` on offices.
- **Containers:** `container-content` and `container-wide` (`main.css`) never
  depend on ancestors. A block has its own container only when
  `useHasContainer()` says so: not nested, in the `default` field list, not on a
  detail page (whose `article` is the container). Its width option
  (`useBlockWidth`) and its space above (`useBlockSpacing`, by the block before
  it) follow the same context. Reason: while dragging, the editor renders a copy
  of the block without its ancestors.
- **GraphQL documents:** `app/graphql/` (queries, shared fragments) and next to
  components; all of `app/**/*.graphql` is loaded. Every paragraph fragment must
  be in the `paragraph` union
  (`components/Paragraph/fragment.paragraph.graphql`, leaves in
  `fragment.paragraphLeaf.graphql`): the edit state loads blocks through it, so
  a missing one has empty props while editing. `pbMutatedEntity` lists the host
  fields the editor updates live. An invalid document makes the daemon hang on a
  prompt (nginx: 502): fix it, then `ddev nuxt restart`.
- **The schema loop:** change the module (submodule) → `ddev drush cr` →
  `bun run drupal:schema` (container; dumps `build/drupal-schema.graphql`, the
  daemon restarts) → `bun run dev:prepare` for the root types (revert its change
  to `playground/app/options-schema.json`).
- **UI strings:** `$texts('key', 'English default')` (nuxt-easy-texts), stored
  in Drupal's texts module, seeded from `content/texts.csv`. Pages outside
  Drupal's reach (welcome, the control app) keep their texts in code.
- **Styling:** Tailwind v4 with its own theme in `app/assets/css/main.css`.
  Default colours, text sizes, fonts, radii, shadows and containers are removed
  (the editor's CSS defines the default names); there are no
  `tracking-*`/`leading-*` utilities. Swatches in the editor use the `-mid`
  colours. Icons come from `app/assets/symbols/*.svg` (`<SpriteSymbol>`).
- **The agent's project pieces** are in `sandbox/frontend/blokkli/` (`skills/`,
  `tools/get_town_data`, `prompts/`), next to `nuxt.config.ts`, not in `app/`.
  Their DE/FR strings are in `blokkli.translations` in `nuxt.config.ts`.
  `enableMock: true` lets a client replay a scripted conversation instead of the
  model; it must be off when hosted.
- **The Test Cases sidebar** (`blokkli/features/test-cases/`): triggers for
  flows that are hard to reach otherwise, also `window.__BLOKKLI__.test` for the
  E2E specs (the `e2e-testing` skill). `devOnly`: the dev server has it, a
  production build doesn't.
- **Server:** `/api/chart-data[/id]` (the charts' data sources, also used by the
  agent's tool); `server/graphqlMiddleware.serverOptions.ts` picks the endpoint
  by the client context's language. `app/graphqlMiddleware.clientOptions.ts` has
  a `@ts-ignore`: the server typecheck checks that file with Nitro's
  `useCurrentLanguage`, which takes an event; the code only runs in the app.

## Environment

| Variable                                                      | Read by                                                  | Without it                                      |
| ------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| `NUXT_SANDBOX_LOGIN_SECRET`                                   | settings.php, the control app                            | a public fallback (hosted: settings.php throws) |
| `DRUPAL_HASH_SALT`                                            | settings.php                                             | a public fallback (hosted: throws)              |
| `NUXT_BLOKKLI_AGENT_AUTH_SECRET`                              | settings.php (dev site, premium sandboxes), the frontend | no agent                                        |
| `NUXT_BLOKKLI_AGENT_API_KEY`                                  | the frontend                                             | the agent only replays mock scripts             |
| `DEEPL_AUTH_KEY`                                              | settings.php (not in E2E sandboxes)                      | no DeepL translation                            |
| `NUXT_ADMIN_PASSWORD`                                         | the control app                                          | `/admin` open locally, 503 when hosted          |
| `NUXT_TURNSTILE_SECRET_KEY`, `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | the control app                                          | no captcha                                      |
| `IS_DDEV_HOSTED`                                              | settings.php, the control app, the frontend's SSR rule   | local behaviour                                 |
| `DDEV_HOSTNAME` (ddev)                                        | settings.php, the control app (`sandboxUrl`)             | —                                               |

`DRUSH_OPTIONS_URI` is set to the primary URL in `config.yaml` (ddev only does
that with settings management, which is off).

## Checks

- `bun run verify` (host or container) runs the formatters, linters, all
  typechecks, phpcs/phpstan over `web/modules/custom` and the unit tests. On a
  failure, read `tmp/verify-output/<timestamp>.txt`.
- `typecheck:sandbox-frontend` and `:sandbox-control` check app and server code
  and need the `.nuxt` folders the daemons generate.
- `typecheck:playground` fails in the container when the host's `bun run dev`
  rebuilt `dist/` (its symlinks point to host paths); run it on the host.
- E2E runs on the host, against sandboxes of this site:
  `bun run test:e2e-drupal` (see E2E tests).
- The module's own tests and checks run in the submodule's own ddev project: in
  `sandbox/drupal/paragraphs_blokkli`, `ddev phpunit-parallel`, `ddev phpcs`,
  `ddev phpstan`.
- After nginx changes: `ddev check-routes`.

## Symptoms

| Symptom                                                         | Cause                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 502 with the Nuxt page                                          | daemon down, `node_modules` missing, or an invalid GraphQL document                                         |
| "This sandbox is private"                                       | not logged in (`ddev drush uli`), or no preview grant                                                       |
| The "unknown sandbox" page                                      | no `sandboxes/<id>/db.sqlite`                                                                               |
| drush: "There's no sandbox '…'"                                 | `--uri` names a sandbox that doesn't exist                                                                  |
| A new option isn't validated or offered in Drupal               | the options schema wasn't regenerated: `ddev nuxt restart`, commit it                                       |
| "Cannot find name" in a sandbox typecheck after a config change | stale `.nuxt`: `ddev nuxt [control] restart`                                                                |
| A new service or route is missing in a sandbox                  | its database's caches: `drush --uri=… cr`, bake for the templates                                           |
| No agent in a sandbox                                           | not premium (`lifetime.json`), or no auth secret                                                            |
| No "Sandbox" button                                             | not logged in with toolbar access, or a sandbox without `--expires`                                         |
| A claim fails with `rate_limit` locally                         | 3 claims an hour, shared by everyone locally                                                                |
| A block has empty props while editing                           | its fragment isn't in the `paragraph` union                                                                 |
| A block's drag copy looks different                             | its layout depends on an ancestor's class                                                                   |
| The editor shows an outdated state after a change elsewhere     | a cached GraphQL result without the tag that invalidates it: `drush cr` confirms; fix the tag in the module |
