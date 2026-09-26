# 06: playground-drupal app

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 03. Grows alongside 04.

## Goal

A Nuxt app that renders the Drupal site and runs the editor with every blökkli
module, consuming blökkli from `src/`, so changes hot-reload.

## Tasks

- [ ] `playground-drupal/nuxt.config.ts`:
  - [ ] `nuxt-graphql-middleware` (it must come before blökkli), then
        `../src/module`, then tailwind.
  - [ ] blökkli modules: `drupal({ templateEditRouteName })`, `agent` (Anthropic
        provider, key from the environment, mock provider enabled), `charts`,
        `tableOfContents`, `iframes`, `readability`, `tailwind`.
  - [ ] `globalOptions`, `colorOptions`, `chunkNames`, `schemaOptionsPath`.
  - [ ] Watch the schema file, so a schema change restarts Nuxt and feature
        detection runs again.
- [ ] GraphQL middleware:
  - [ ] one endpoint per language
  - [ ] in dev, download the schema from the local site, and commit it so
        typecheck works without ddev
  - [ ] server options that forward cookies and Host (copy from the starterkit's
        `frontend/server/graphqlMiddleware.serverOptions.ts`)
- [ ] Pages:
  - [ ] a catch-all page that resolves the Drupal route by path, with language
        prefix
  - [ ] `blokkli/template/[uuid]` and `blokkli/library-item/[uuid]`
  - [ ] 404 and 403 pages
  - [ ] a "this sandbox is private" page for anonymous users
- [ ] `Paragraph/*` components with GraphQL fragments for every bundle from
      chunk 04, plus the fragment components.
- [ ] `app/blokkli.editAdapter.ts` that wraps `#blokkli/drupal-adapter` and adds
      the app-level extension points only the mock has today: `getAnalyzers`,
      `getChartDataSources`, `getChartDataSourceCapabilities`,
      `getChartDataSourceData`, `getGridMarkup`. `userSettings` needs a backend:
      that's a follow-up in `paragraphs_blokkli`.
- [ ] Example agent skills, tools and prompts under `playground-drupal/blokkli/`
      (see winterthur's `frontend/blokkli/`).
- [ ] Coverage check: in `playground-drupal`, fail dev startup (or print a clear
      report) when the Drupal module disables a feature because the schema lacks
      it. See `context.features.disableFeature` in
      `src/modules/drupal/index.ts`.
- [ ] Don't copy `usePolling: true` from the mock playground. The repo is on
      ext4, and inotify works through the bind mount.
- [ ] `package.json` script `typecheck:playground-drupal`. Add it to
      `typecheck`, `dev:prepare` (`nuxi prepare playground-drupal`) and
      `verify.sh`. There's no `dev:drupal` script: the ddev daemon starts `nuxi`
      itself, and `ddev nuxt` controls it (chunk 02).

## Acceptance criteria

- As an editor, any seeded page can be opened in edit mode at
  `https://blokkli.ddev.site`.
- The coverage check passes: every feature is available.
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
