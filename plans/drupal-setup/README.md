# Drupal setup: dev environment and public sandbox

Meta plan, started 2026-09-26. Each chunk lives in its own file in this folder
and tracks its own status. The [index](#chunks) mirrors those statuses.

## Why

- Building a feature end to end today means: mock it in the playground's mock
  adapter, implement it in `paragraphs_blokkli`, `yalc` the editor into a
  starterkit-based project, test there, and repeat. The mock adapter
  (`playground/app/blokkli.editAdapter.ts`, ~3,200 lines, plus ~1,700 lines of
  mock storage) is a second backend that drifts away from Drupal.
- `paragraphs_blokkli` is developed as a Composer `source` checkout inside
  client projects, and only one of them is ever current.
- `build/drupal-schema.graphql`, which types the Drupal adapter, is downloaded
  from a starterkit instance and lags behind the module.
- Nobody can try blökkli with Drupal without setting up the starterkit locally.

## Goals

1. A Drupal site with a separate Nuxt frontend (`playground-drupal`) in this
   repo. It runs in ddev, uses **every** blökkli feature, and has EN (source
   language), DE and FR content.
2. The same stack hosted as a public sandbox: every visitor gets an isolated
   copy that expires.
3. Local development runs the same stack as the sandbox, not a variant of it.

## Non-goals (for now)

- Removing the mock playground. It stays, including its E2E suite. Removing it
  is a long-term goal for a separate plan.
- E2E tests against Drupal.
- Changing where the projects live: `paragraphs_blokkli` stays on drupal.org and
  `@blokkli/editor` stays on GitHub. They remain separate repositories.
- Running Drupal in the browser (php-wasm). It would differ from what real
  projects run, which defeats the purpose.

## Decisions

| Topic                | Decision                                                                                                                                                                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend runtime     | Nuxt runs inside the ddev web container. One domain, with nginx path rules deciding between Nuxt and Drupal, as in the starterkit. blökkli relies on this, e.g. when it opens Drupal forms in iframes.                                                                                                                            |
| `paragraphs_blokkli` | Git submodule of the drupal.org repository (branch 2.0.x), symlinked in through a Composer path repository. Each blökkli branch pins the module commit it works with.                                                                                                                                                             |
| Database             | SQLite, one file per sandbox. Confirmed by the [spike](01-sqlite-spike.md) on 2026-09-26, with `synchronous=NORMAL` and the memory backend for the entity cache bin.                                                                                                                                                              |
| Isolation            | Each sandbox gets its own database, files directory, subdomain and hash salt. Code is shared.                                                                                                                                                                                                                                     |
| Languages            | EN (default and source language), DE, FR. Every language has a URL prefix (`/en`, `/de`, `/fr`), as in the starterkit (2026-09-26, chunk 03).                                                                                                                                                                                     |
| Sandbox lifetime     | Normal: 24h maximum, deleted after 2h idle. Premium: 7 days.                                                                                                                                                                                                                                                                      |
| Paid features        | The agent is only available in premium sandboxes, which are created by invitation. Costs are capped by a spend limit on a dedicated provider key, with no budget logic in the app. DeepL costs are not a concern.                                                                                                                 |
| Visibility           | Anonymous users don't get `access content`. Pages are visible to the sandbox's own users, or through the session grant from "preview on smartphone". For anonymous visitors, that grant needs code (chunk 10, F22; 2026-09-27).                                                                                                   |
| Hosting              | Hosted ddev on the existing Hetzner server. Deferred until everything works locally (M3).                                                                                                                                                                                                                                         |
| Branches             | Two hosted instances: `main` (public) at `sandbox.blokk.li` and `dev` (maintainer and invited testers) at `dev-sandbox.blokk.li`. Sandboxes are subdomains of these.                                                                                                                                                              |
| Order                | Local first (M0–M2). DNS, TLS and hosting come after.                                                                                                                                                                                                                                                                             |
| Nuxt app             | `playground-drupal/`                                                                                                                                                                                                                                                                                                              |
| Node tooling         | The Drupal stack's tooling runs in the web container, as in the other ddev projects: `ddev ssh`, then `bun …`. bun is part of the web image, pinned to `packageManager` (2026-09-26, chunk 02). The mock playground and its E2E suite stay on the host; both coexist until the mock playground is removed (2026-09-26, chunk 07). |
| nginx                | One public server for every hostname; Drupal paths are anchored, with an optional language prefix; both upstreams get the browser's host (2026-09-26, chunk 02).                                                                                                                                                                  |
| Drupal config        | Profile-less, installed from `drupal/config/sync` (`ddev drush si --existing-config -y`). Config is the source of truth; it was bootstrapped once from core's `standard` recipe (2026-09-26, chunk 03).                                                                                                                           |
| Secrets              | From the environment: `.ddev/.env.web` (gitignored). The hash salt has a public local fallback; the hosted site sets `IS_DDEV_HOSTED=true`, and settings.php then refuses to run without its own salt (2026-09-26, chunk 03).                                                                                                     |
| Content model        | Not a mirror of the mock playground. The base content paragraphs come first (chunk 04). The demo concept (14a) then decides the topic and the content model, before the feature sub-chunks of 13 add bundles and paragraph types; the demo content itself comes last (14b) (2026-09-26).                                          |
| Frontend routing     | Hand-written in `playground-drupal`: one `route` query, the language is the path's first segment. No vuepal or nuxt-language-negotiation (2026-09-26, chunk 06). UI strings go through nuxt-easy-texts and the Drupal `texts` module, as in the starterkit (the user, 2026-09-27, chunk 13f).                                     |
| Rendering            | SSR only for anonymous users and only locally, to test blökkli's server code paths. Logged-in users, editing and the hosted instance get the SPA (2026-09-26, chunk 06).                                                                                                                                                          |
| GraphQL schema       | One generated file, `build/drupal-schema.graphql`, dumped from the local site with `bun run drupal:schema`. The root config and `playground-drupal` both use it (2026-09-26, chunk 07).                                                                                                                                           |
| Demo topic           | A fictional Swiss municipality, Blockingen/Bloquens: a bilingual town by a lake. Many kinds of content (services, knowledge, news, politics, leisure) and structured data (events, offices). Chosen over non-fictional topics after a brainstorm (2026-09-26, chunk 14a).                                                         |

When a decision changes, update this table and add the date.

## Architecture

### Repo layout (target)

```
blokkli/
├── .ddev/                          # project "blokkli" → https://blokkli.ddev.site
│   ├── nginx_full/nginx-site.conf  # path routing: Nuxt or Drupal
│   └── nuxt-daemon.sh              # the Nuxt dev server daemon (`ddev nuxt`)
├── drupal/                         # Composer root
│   ├── composer.json
│   ├── config/sync/
│   ├── content/                    # declarative seed content
│   ├── db/                         # gitignored: the dev site's SQLite database
│   ├── paragraphs_blokkli/         # git submodule (drupal.org, 2.0.x)
│   ├── private/                    # private files; only .htaccess is tracked
│   ├── sandboxes/                  # gitignored: template + one folder per sandbox
│   ├── web/                        # docroot; core and contrib are gitignored
│   │   └── modules/custom/
│   │       ├── blokkli_playground/  # seed, bake, example plugins
│   │       └── blokkli_sandbox/     # sandbox routing, claim, cleanup
│   └── mocks.graphql               # existing, used by the root typecheck
├── playground-drupal/              # Nuxt app using the Drupal adapter
├── playground/                     # mock playground, unchanged
└── plans/drupal-setup/             # this plan
```

### Request flow

```
https://k3f9.sandbox.blokk.li/...     (locally: https://k3f9.blokkli.ddev.site)
        │
      nginx ── path rules ──► Drupal paths (graphql, user, admin, media,
        │                      paragraphs_blokkli forms, files, …)
        ▼                                         │
  Nuxt SSR: one process for all                   ▼
  sandboxes, forwards Host ──────────►  PHP-FPM, one codebase
                                        settings.php: Host → sandbox id
                                        → database, files, hash salt
```

### Sandbox model

- **Default site** (no subdomain): the dev site locally. When hosted, it's the
  control plane at the apex (`sandbox.blokk.li`): the sandbox list, claiming,
  invitations and cleanup.
- **Sandbox**: a copy of the baked template (database plus files) with its own
  subdomain and hash salt. Visitors are logged in as a seeded user via a signed
  token and never see a password. Sandboxes expire and are deleted.

## Chunks

Milestones:

- **M0 Spike:** find out whether SQLite works.
- **M1 Local dev site:** `ddev start` gives a working blökkli + Drupal dev
  environment. Useful on its own.
- **M2 Sandboxes (local):** multiple isolated sandboxes work locally.
- **M3 Hosted:** public at `*.sandbox.blokk.li` (`main`) and
  `*.dev-sandbox.blokk.li` (`dev`).

| #   | Chunk                                                      | Milestone | Status | Depends on                        |
| --- | ---------------------------------------------------------- | --------- | ------ | --------------------------------- |
| 01  | [SQLite spike](01-sqlite-spike.md)                         | M0        | done   | –                                 |
| 02  | [ddev and repo layout](02-ddev-and-repo-layout.md)         | M1        | done   | 01                                |
| 03  | [Drupal base site](03-drupal-base-site.md)                 | M1        | done   | 02                                |
| 04  | [Base content model](04-base-content-model.md)             | M1        | done   | 03                                |
| 05  | [Seed, bake, reset](05-seed-bake-reset.md)                 | M1        | todo   | 13a–13i                           |
| 06  | [playground-drupal app](06-playground-drupal-app.md)       | M1        | done   | 03, 04; grows with 13             |
| 07  | [Dev workflow integration](07-dev-workflow-integration.md) | M1        | done   | 06                                |
| 08  | [Sandbox routing](08-sandbox-routing.md)                   | M2        | todo   | 05                                |
| 09  | [Control plane: claim and invite](09-control-plane.md)     | M2        | todo   | 08                                |
| 10  | [Access and guardrails](10-access-and-guardrails.md)       | M2        | todo   | 08                                |
| 11  | [Premium features](11-premium-features.md)                 | M2        | todo   | 09                                |
| 12  | [Hosted deploy](12-hosted-deploy.md)                       | M3        | todo   | 09, 10; 14b for the public launch |
| 13  | [Editor features](13-editor-features.md) (overview)        | M1        | todo   | 04, 06; 14a                       |
| 13a | [Base setup skill](13a-base-setup-skill.md)                | M1        | done   | 06                                |
| 13b | [Block types](13b-block-types.md)                          | M1        | done   | 14a                               |
| 13c | [Hosts](13c-hosts.md)                                      | M1        | done   | 13b                               |
| 13d | [Reusable content](13d-reusable-content.md)                | M1        | done   | 13b, 13c                          |
| 13e | [Publishing](13e-publishing.md)                            | M1        | done   | 13c                               |
| 13f | [Translation](13f-translation.md)                          | M1        | done   | 13c                               |
| 13g | [Search and plugins](13g-search-and-plugins.md)            | M1        | todo   | 13c, 13d                          |
| 13h | [Collaboration and roles](13h-collaboration-roles.md)      | M1        | todo   | 13b–13g, 13i                      |
| 13i | [Agent and modules](13i-agent-and-modules.md)              | M1        | todo   | 13b                               |
| 13j | [Skill tests](13j-skill-tests.md)                          | M1        | todo   | 13a–13i                           |
| 14a | [Demo concept](14a-demo-concept.md)                        | M1        | done   | 04                                |
| 14b | [Demo content](14b-demo-content.md)                        | M3        | todo   | 05, 13, 14a                       |

Statuses: `todo`, `in progress`, `done`, `dropped`.

Chunks 13 and 14 are split into lettered sub-chunks; 13's file is the overview
(order, skill conventions, feature matrix). 13a–13f and 14a are done; next up is
13g or 13i.

Bugs in other projects found along the way (mostly `paragraphs_blokkli`) are
tracked in [findings.md](findings.md) and fixed separately. F1 and F2 must be
fixed before chunk 09's "Invite a colleague".

## Open questions

- **DeepL.** Available in normal sandboxes too, or only in premium ones?
- **PHP version.** The starterkit uses 8.5, and the spike ran everything on
  8.5.7 without problems. Use 8.5 unless something speaks against it.
- **For M3, not needed yet:**
  - **DNS for the wildcard certificates.** blokk.li is on Netlify DNS but can
    move. Either use a Netlify DNS resolver for the ACME DNS-01 challenge (lego
    has a `netlify` provider; verify), or move or delegate the zones to another
    provider.
  - **Hetzner server.** Does anything else run on it? The sandbox should be
    isolated from other workloads (see chunk 12).

## Reference: facts that shape the design

- **One edit state per host entity, shared by all users.** In
  `paragraphs_blokkli`,
  `ParagraphsBlokkliEditStateStorage::loadForEntityTypeAndUuid()` looks it up by
  host entity only. Ownership is informational (`takeOwnership()` only reassigns
  `uid`). So isolation has to happen per site, not per user.
- **APCu prefix.** Drupal builds the APCu cache prefix from the hash salt and
  the site path (`Settings::getApcuPrefix()`). All sandboxes share
  `sites/default`, so with a shared salt they would share APCu entries (config,
  discovery). Hence a per-sandbox hash salt.
- **Login links.** One-time login links are an HMAC keyed with the hash salt and
  the user's password hash (`OneTimeAuthentication`). Seeded users have no known
  passwords, so the salt is what protects them: a public salt would let anyone
  forge a login link. Cloned sandboxes have identical users, so with a shared
  salt a link from one sandbox would work in another. Hence a secret,
  per-sandbox salt and no passwords. `system.private_key` (regenerated on claim)
  protects other tokens, not login links.
- **Feature detection happens twice** in the Drupal module:
  - At build time: a feature is disabled when the schema lacks its mutation
    (`context.features.disableFeature` in `src/modules/drupal/index.ts`).
  - At runtime: from `pbConfig.availableFeatures` (`getDisabledFeatures` in
    `src/modules/drupal/runtime/adapter/index.ts`).
- **Agent auth.** The agent server only accepts tokens signed with `authSecret`
  (`src/modules/agent/runtime/server/agent.ts`). Drupal issues them
  (`paragraphs_blokkli_agent.settings: auth_secret`).
- **Absolute paths in generated `.nuxt` files.** `nuxt.json`,
  `types/layouts.d.ts` and `types/nitro-imports.d.ts` contain them, so they
  point to `/var/www/html` when Nuxt runs in the container. That's fine: the
  tsconfig files use relative paths, and typechecks run in the container too, as
  in the starterkit.
- **Mock-only adapter methods.** Only the mock implements `getAnalyzers`, the
  three chart data source methods, `getGridMarkup` and `userSettings`. The first
  three are app-level extension points; `userSettings` needs a backend.
- **Starterkit (drupal.org `blokkli_starterkit`, 2.0.x) parts to reuse:**
  - nginx route list `scripts/nginx-conf-generator/config/base.yml`
  - templates `.ddev/nginx_full/nginx-site-{local,hosted}.conf.template` (the
    local one is ported in chunk 02, with fixes: F6 in
    [findings.md](findings.md))
  - `frontend/server/graphqlMiddleware.serverOptions.ts`
  - `frontend/.config/graphqlMiddleware.ts`
  - `frontend/app/blokkli.editAdapter.ts`
  - pages `frontend/app/pages/blokkli/{template,library-item}/[uuid].vue`
  - `drupal/config/default/graphql.graphql_servers.graphql.yml`
  - `drupal/config/default/paragraphs_blokkli.settings.yml`
  - the example plugins in `drupal/docroot/modules/custom/blokkli_starterkit/`
  - `.ddev/web-build/Dockerfile.bun` (pinned to a version in chunk 02)
  - Skip: rokka, Typesense/Tika, memcache, TFA, keycloak, and the
    multisite/traefik generator.
- **Winterthur (a project built on the starterkit) shows the richest blökkli
  config:**
  - agent, charts and readability in `frontend/.config/blokkli.ts`
  - agent skills, tools and prompts under `frontend/blokkli/`
  - custom analyzers under `frontend/app/blokkli/analyzer/`
  - translatable config pages
- **No project uses these yet:** table-of-contents, iframes, the tailwind
  module, blökkli table editing, and DeepL together with the agent.

## Working on this plan

- Pick the next `todo` chunk whose dependencies are `done`. Set its status to
  `in progress`, both in the chunk file and in the index above.
- Tick tasks as you go. Write findings and deviations under "Notes" in the
  chunk; later chunks build on them.
- A chunk is `done` when all its acceptance criteria hold. Update the index.
- If a finding changes the plan, update the affected chunks and the Decisions
  table in the same change.
- A bug that belongs in another project goes into [findings.md](findings.md),
  not into a chunk.
