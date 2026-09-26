# 06: playground-drupal app

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 03, 04. Grows alongside 13.

## Goal

A Nuxt app that renders the Drupal site and runs the editor with every blökkli
module, consuming blökkli from `src/`, so changes hot-reload.

## Tasks

- [x] `playground-drupal/nuxt.config.ts`:
  - [x] `nuxt-graphql-middleware` (it must come before blökkli), then
        `../src/module`. Tailwind v4 through `@tailwindcss/vite`.
  - [x] blökkli modules: `drupal({ templateEditRouteName })`, `agent`
        (Anthropic, the mock playground's models, mock provider enabled),
        `charts`, `tableOfContents`, `iframes`, `readability`. `tailwind` is a
        Tailwind config export, not a module.
  - [ ] `globalOptions`, `colorOptions`, `chunkNames`, `schemaOptionsPath`:
        moved to [chunk 13](13-editor-features.md), with Drupal's `schema_file`.
  - [x] Watch the schema file, so a schema change restarts Nuxt and feature
        detection runs again.
- [x] GraphQL middleware:
  - [x] one endpoint per language
  - [x] the schema is committed (`playground-drupal/schema.graphql`; since chunk
        07 the shared `build/drupal-schema.graphql`) and dumped with
        `bun run drupal:schema`, since `/graphql` is not open to anonymous users
  - [x] server options that forward cookies and the X-Forwarded headers
- [x] Pages:
  - [x] a catch-all page that resolves the Drupal route by path, with language
        prefix
  - [x] `blokkli/template/[uuid]` and `[lang]/blokkli/library-item/[uuid]`
  - [x] 404 and 403 pages
  - [x] a "this sandbox is private" page for anonymous users
- [x] `Paragraph/*` components with GraphQL fragments for every bundle from
      chunk 04. Chunk 13 adds its bundles and the fragment components.
- [x] `app/blokkli.editAdapter.ts` that wraps `#blokkli/drupal-adapter` and adds
      `getAnalyzers` and `getGridMarkup`. The chart data sources move to chunk
      13 with a chart block. `userSettings` needs a backend: that's a follow-up
      in `paragraphs_blokkli`.
- [ ] Example agent skills, tools and prompts under `playground-drupal/blokkli/`
      (see winterthur's `frontend/blokkli/`): moved to chunk 13.
- [x] Coverage check: the Drupal module logs which features it disables for lack
      of schema support (`src/modules/drupal/index.ts`).
- [x] Don't copy `usePolling: true` from the mock playground. The repo is on
      ext4, and inotify works through the bind mount.
- [x] `package.json` script `typecheck:playground-drupal`, in `typecheck` and
      `verify.sh`. Not in `dev:prepare`: `nuxi prepare playground-drupal` would
      clear the daemon's `.nuxt`, so the typecheck uses the daemon's. There's no
      `dev:drupal` script: the ddev daemon starts `nuxi` itself, and `ddev nuxt`
      controls it (chunk 02).

## Acceptance criteria

- As an editor, a page can be opened in edit mode at
  `https://blokkli.ddev.site`.
- The coverage check runs. Passing it (every feature available) is
  [chunk 13](13-editor-features.md)'s acceptance criterion.
- Editing `src/` hot-reloads; `bun run typecheck:playground-drupal` passes.

## Notes

From [chunk 02](02-ddev-and-repo-layout.md) (2026-09-26). Chunk 02 left a
minimal app (`nuxt.config.ts` with `vite.server.allowedHosts: true`, and
`app/pages/index.vue`); keep `allowedHosts`, nginx forwards any Host.

- **The Drupal module needs an app-level adapter when it runs from `src/`.** Its
  default `editAdapterPath` is `./runtime/adapter/index.js`, which only exists
  in `dist/`, so module setup throws "Missing blökkli edit adapter". The planned
  `app/blokkli.editAdapter.ts` solves it. Check that importing the Drupal
  adapter from a `.ts` wrapper resolves to `index.ts`.
- **Import the module from `../src/...`, never `@blokkli/editor/*`.** Those
  resolve to `dist/` through the package's own `exports`. Don't set
  `PLAYGROUND_MODULE_BUILD`, or the mock playground's blocks leak in.
- **`nuxt-graphql-middleware`:**
  - It must come before blökkli. The Drupal module throws otherwise (its own
    docs show the wrong order).
  - It needs `graphqlEndpoint` even with `downloadSchema: false`.
  - When a download fails in dev, it asks on the terminal whether to use the
    schema on disk. The daemon has no terminal, so use `downloadSchema: false`
    and download explicitly (chunk 07's `drupal:schema`).
- **The app must define the fragments `paragraph` (on `Paragraph`) and
  `pbMutatedEntity` (on `Entity`).** The Drupal module's documents spread them.
  The root config gets them from `drupal/mocks.graphql`.
- **Nuxt 4 layout:** with an `app/` folder, pages, layouts and components live
  under `app/`, not at the app root.
- **Files that must exist when the module runs from `src/`:**
  `src/runtime/editor/css/output.css` (`bun run styles:build`) and
  `src/runtime/editor/features/changelog/changelog.json` (`bun run changelog`).
  Both are gitignored.
- **SSR requests to Drupal must forward `X-Forwarded-Host` and
  `X-Forwarded-Proto`** (and the cookies). nginx turns `X-Forwarded-Host` into
  the Host Drupal sees, and sandboxes are chosen by host (chunk 08). Without the
  proto, Drupal looks for the `SESS…` cookie instead of `SSESS…`, and SSR runs
  as anonymous. Request `http://127.0.0.1/{lang}/graphql` inside the container.
- **Typecheck runs in the container**, like everything else (`ddev ssh`), and
  shares `playground-drupal/.nuxt` with the daemon. `nuxi prepare` removes
  `.nuxt/dist`, and the daemon then restarts Nuxt (about a second). Harmless,
  but a typecheck script that doesn't need to prepare shouldn't.
- **Follow-up: the module's Tailwind pass scans the working directory**
  (`src/build/templates/definitions/styles.ts`, see chunk 02's notes). The
  daemon runs from the repo root, so it picks up candidates from `drupal/` too.
  Only extra CSS; fix it in the module.

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **GraphQL access is open.** Anonymous users have neither `access content` nor
  GraphQL permission, so `/graphql` returns 403 for them; only the admin can
  query it. Decide how SSR gets access: a GraphQL permission for anonymous and
  authenticated, or the starterkit's `graphql_security` token. The token only
  opens the endpoint; entity access still runs as the forwarded session. See
  also chunk 10.
- **Frontend extensions:** the server has `entity_query`, `formatted_date`,
  `language_schema`, `routing` and `user`, plus the blökkli ones. Add what the
  app needs (e.g. `local_tasks`, `messenger`, `language_switch_links`,
  `masquerade`).
- **Every language has a prefix.** Nuxt owns `/` and redirects it to `/en`. The
  mock playground leaves EN unprefixed, so ported E2E specs need their URLs
  mapped.
- **`/blokkli/library-item/{uuid}`** is the page Drupal links to for library
  items; nginx sends it to Nuxt.
- **Secrets:** the agent's `NUXT_BLOKKLI_AGENT_AUTH_SECRET` (read by Drupal and
  Nuxt) and the LLM key go in `.ddev/.env.web`.

From [chunk 04](04-base-content-model.md) (2026-09-26), details under its "For
chunk 06":

- **`addBehaviour`:** title and text can be added inline; image, video and
  button need the form, because `add` can't set required fields.
- **Document buttons** link to `entity:media/ID`, which resolves to the media
  edit page. Use the `media` extension's `mediaFileUrl`, and `uri`, not
  `resolvableUri`.
- **Images:** enable the `image` extension and add the frontend's image styles.

### Using it (2026-09-26)

- **Log in:** `ddev drush uli /en/node/1`. The one-time link redirects to that
  page. `si --existing-config` gives the admin a random password.
- **Pages:** the front page is `/node` (no view), so `/` → `/en` is a 404 until
  chunk 05 sets `system.site.page.front`. The 404 page links to the content
  overview and to "add a page". Every page is at `/{en,de,fr}/…`.
- **The agent** needs a shared secret for Drupal and Nuxt:
  `ddev dotenv set .ddev/.env.web --nuxt-blokkli-agent-auth-secret=<random>`,
  then `ddev restart`: the env is read when the container starts. Without it,
  Drupal throws when the agent panel opens. The LLM key
  (`NUXT_BLOKKLI_AGENT_API_KEY`) is optional; the mock provider works without
  it.
- **The daemon:**
  - `ddev nuxt restart` for a stuck daemon, and `ddev nuxt logs`.
  - Changes to `nuxt.config.ts` and to the schema file restart Nuxt on their
    own.
- **Schema:** after a Drupal change to the GraphQL server or the module's
  schema, run `bun run drupal:schema` in the container.
- **Editor CSS:** Tailwind changes in `src/` need `bun run styles:watch`, as
  with the mock playground.

### How it's built (2026-09-26)

- **Routing is hand-written** (decided with the user: no vuepal,
  nuxt-language-negotiation or nuxt-easy-texts, no new Drupal modules).
  - `app/pages/[...slug].vue` runs the `route` query with the full path.
  - The language is the path's first segment (`shared/languages.ts`).
    `app/graphqlMiddleware.clientOptions.ts` sends it along, and the server
    options pick `/{language}/graphql`.
  - Anything but a `NodePage` is a 404, and a 403 from the proxy is the private
    page (`app/error.vue`).
- **SSR only for anonymous users, and only locally** (decided with the user;
  some blökkli code branches on `import.meta.server`, to be tested later).
  - `server/middleware/spa.ts` switches to the SPA for a Drupal session cookie,
    `blokkliEditing`/`blokkliPreview` in the path, and `IS_DDEV_HOSTED=true`.
  - During SSR, `app/plugins/graphqlMiddleware.ts` passes the browser's headers
    on to the proxy.
  - Anonymous users can't see content yet, so SSR only renders the private page.
    Local content access for anonymous users is chunk 10's decision.
- **The GraphQL proxy** (`server/graphqlMiddleware.serverOptions.ts`):
  - requests `http://127.0.0.1/{language}/graphql` (nginx in the container)
  - forwards `cookie` and `x-forwarded-{for,host,port,proto}` (the whitelist in
    `shared/request.ts`)
  - returns Drupal's `set-cookie`
  - keeps Drupal's error status
- **Drupal config for the app:**
  - the GraphQL extensions `image` (`derivative`) and `media` (`mediaFileUrl`)
  - the media field `thumbnail`
  - the image style `content`
  - `execute graphql arbitrary graphql requests` for `authenticated`
- **Blocks:**
  - title and text are added inline (`editable:field_…`)
  - image, video and button go through the form or the media library
  - the video block is a thumbnail linking to the video; an embed comes with
    chunk 14
  - the button has a `style` option, the only blökkli option so far
- **Library items** open at `/{lang}/blokkli/library-item/<uuid>`: the adapter
  prefixes the URL. Templates at `/blokkli/template/<uuid>`, by route name.
- **Type declarations:** `playground-drupal/declarations.d.ts` includes the root
  `declarations.d.ts` (for `*.vue?blokkliEditing=true` imports), as the mock
  playground does.

### Findings (2026-09-26)

- **A full build in `dist/` breaks `typecheck:playground`** ("separate
  declarations of a private property"): the mock playground imports
  `@blokkli/editor/modules`, which resolves to dist. `bun run dev:prepare` (a
  stub build) fixes it. Never import `@blokkli/editor/*` from playground-drupal.
- **Invalid GraphQL documents hang the daemon.** nuxt-graphql-middleware asks on
  the terminal, and the daemon has none, so nginx serves 502. Check
  `ddev nuxt logs`; validate new documents before the daemon picks them up.
- **`drush graphql:dump` resolves relative paths against the Drupal root.** The
  script passes an absolute path.
- **Nuxt 4.4.8 restarts on a `watch` entry that is an exact file path**, so the
  schema needs no custom module.
- **The Drupal module now reports disabled features** in one log line ("The
  Drupal GraphQL schema supports all features." here). A template type that
  lacks required fields now really disables templates; before, it only warned.

### Verification (2026-09-26)

- `ddev drush si --existing-config -y`: `config:status` is clean.
- `bun run verify` in the container: format, lint, all five typechecks and the
  unit tests pass (after `bun run dev:prepare`).
- Nuxt starts cleanly: "All GraphQL documents are valid", "The Drupal GraphQL
  schema supports all features".
- With a test page (title, lead, a title and a text block):
  - anonymous `/en/node/1` (HTML): status 403, the private page rendered on the
    server
  - an unknown language (`/xx/foo`): 404
  - `/` redirects to `/en`
  - as admin: `/en/node/1` is the SPA shell. The proxied `route` query returns
    the node, its paragraphs and `blokkliProps` (permissions view, review, edit,
    delete).
- `bun run drupal:schema` restarts Nuxt.
- `ddev check-routes`: all 40 rows pass.
- **In the browser** (the user): the editor opens on the test page, the block
  types can be added and edited, and editing `src/` hot-reloads.
