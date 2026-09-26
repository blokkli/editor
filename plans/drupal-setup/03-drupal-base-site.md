# 03: Drupal base site

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 02

## Goal

A Drupal 11 site that installs from config in one command, with
`paragraphs_blokkli`, GraphQL and three languages. `settings.php` is shaped so
that chunk 08 can override everything per sandbox.

## Tasks

- [x] `drupal/composer.json`:
  - [x] A path repository for `paragraphs_blokkli` (listed first,
        `symlink: true`, `versions` → `2.0.x-dev`).
  - [x] `paragraphs` (with `paragraphs_library`), `entity_usage`, `graphql` 5,
        `graphql_core_schema`, `scheduler`, `search_api`, `masquerade`,
        `translatable_config_pages` and `deeplcom/deepl-php`.
  - [x] DeepL needs no tmgmt: `paragraphs_blokkli_deepl` only needs the PHP
        library.
- [x] `drupal/web/sites/default/settings.php` (tracked):
  - [x] SQLite at `drupal/db/site.sqlite` with the chunk 01 settings, private
        files in `drupal/private`, config in `drupal/config/sync`. These paths
        are fixed; chunk 08 derives a sandbox's paths from the Host.
  - [x] From the environment: the hash salt (`DRUPAL_HASH_SALT`, with a public
        local fallback), the DeepL key (`DEEPL_AUTH_KEY`), the agent secret
        (`NUXT_BLOKKLI_AGENT_AUTH_SECRET`) and the trusted hosts
        (`DDEV_HOSTNAME`).
  - [x] A guard: with `IS_DDEV_HOSTED=true` and no `DRUPAL_HASH_SALT`, it
        throws.
  - [x] Reverse proxy: `PRIVATE_SUBNETS`, trusting only
        `X-Forwarded-For/Host/Proto`.
  - [x] `skip_permissions_hardening`, no shared cache backend, a
        `settings.local.php` include, and a marked spot for the sandbox include
        (chunk 08).
- [x] `.ddev/config.yaml`: `DRUSH_OPTIONS_URI=$DDEV_PRIMARY_URL`. Secrets go in
      the gitignored `.ddev/.env.web`.
- [x] Config, bootstrapped once and committed to `drupal/config/sync` (162
      files, profile-less):
  - [x] EN (default), DE and FR, all with a URL prefix, plus the starterkit's
        negotiation, including `language-graphql-operation`.
  - [x] Content translation, as in the starterkit.
  - [x] A minimal content model: node type `page` with `field_paragraphs`,
        paragraph type `text` with `field_text`. Chunk 04 grows it.
  - [x] Every `paragraphs_blokkli` submodule, and `paragraphs_blokkli.settings`
        with `enabled_types: {node: [page]}`.
  - [x] The GraphQL server `graphql` (`core_composable`, `/graphql`) with
        `entity_query`, `formatted_date`, `language_schema`, `routing`, `user`
        and every blökkli extension.
- [x] `ddev drush si --existing-config -y` works on an empty and on an existing
      database.
- [x] Routes: a one-time audit of every route's first path segment against
      nginx, plus new rows in `ddev check-routes`.

## Acceptance criteria

- A fresh install from config works with one command.
- The `/graphql` schema contains every mutation the Drupal module knows (compare
  with the `addMutation(...)` list in `src/modules/drupal/index.ts`).
- A PHP change in `drupal/paragraphs_blokkli` takes effect after `drush cr`,
  with no reinstall.

## Notes

### Using the site

- **Install or reinstall:** `ddev drush si --existing-config -y`, then
  `ddev drush uli`. That takes about 2 s. On an existing database drush drops
  every table first (through the `sqlite3` CLI, which works despite Drupal's
  `NOCASE_UTF8` collation).
- **Config is the source of truth.** Change config in the UI or with drush, run
  `ddev drush cex`, and commit `drupal/config/sync`. After a checkout, reinstall
  or run `ddev drush cim`.
- **Secrets** go in `.ddev/.env.web`, e.g.
  `ddev dotenv set .ddev/.env.web --deepl-auth-key=…`, then `ddev restart`. An
  empty value turns the feature off. `.ddev/config.yaml` lists the keys; ddev's
  `.ddev/.gitignore` ignores `*.example` files, so there's no example file.
- **Anonymous users** get no `access content` and no GraphQL access (403 on
  `/graphql`). Only the admin can query `/graphql` for now; chunk 06 decides how
  SSR gets access.

### How the config was bootstrapped

This ran once, on 2026-09-26. The bootstrap script wasn't committed: config is
the source of truth.

1. `ddev drush si core/recipes/standard --site-name=blökkli --account-name=admin --site-mail=admin@example.com -y`
   - This gives a profile-less site with claro and olivero, the HTML formats
     with CKEditor 5, the administrator and content_editor roles, user pictures,
     navigation and `automated_cron`.
   - drush's install form installed `update` anyway, despite
     `install_configure_form.enable_update_status_module=0`.
2. `drush en` language, content_translation, paragraphs, paragraphs_library,
   entity_usage, graphql, graphql_core_schema, scheduler, search_api,
   search_api_db, masquerade and translatable_config_pages. Then every
   `paragraphs_blokkli` submodule, and core `media` (see below).
3. A `drush php:script` created:
   - DE and FR, the prefixes `{en: en, de: de, fr: fr}`, and `language.types` as
     in the starterkit
   - `page` + `field_paragraphs` (ERR: storage translatable, field not;
     paragraphs widget)
   - `text` + `field_text` (`text_long`)
   - `language.content_settings` for `node.page` and `paragraph.text` (enabled),
     and for `blokkli_fragment`, `from_library`, the library item and the
     template (disabled)
   - `paragraphs_blokkli.settings`, and
     `paragraphs_blokkli_deepl.settings.language_mapping` (EN-GB, DE, FR)
   - the GraphQL server, ported from the starterkit's
     `graphql.graphql_servers.graphql.yml`
4. Trimmed:
   - `drush pmu announcements_feed block_content update`
   - deleted the frontpage, glossary, archive, who_s_new, who_s_online and
     content_recent views
   - `drush role:perm:remove anonymous 'access content'` (README: Visibility)
5. Set `field_paragraphs`' allowed paragraph types explicitly (see below), then
   `drush cex`. Checks:
   - no secrets in the export (`grep -E "(api_key|auth_secret): '.+'"`)
   - no `profile` key
   - every config object valid against its schema (a `SchemaCheckTrait` loop;
     drush has no `config:inspect`)

### Findings

- **Profile-less works.** The starterkit installs the same way. With no
  `profile` key in `core.extension.yml`, drush installs without a profile. The
  `standard` profile would have worked too: it has no `hook_install` in 11.4.
- **drush si rewrites a tracked settings.php when the hash salt is empty or the
  sync directory is missing.** It then writes a random salt and a literal
  `$databases` into the file. So the salt has a fallback, and
  `drupal/config/sync` must exist before the first install.
- **The GraphQL server needs `bundles`.** graphql_core_schema only generates
  bundle types (`NodePage`, `ParagraphText`, `ParagraphBlokkliFragment`, …) for
  bundles listed under `schema_configuration.core_composable.bundles`. The
  others become `…Unexposed`, without their fields. The editor would then
  disable fragments and library. The spike's server had this gap too.
- **Never use the DeepL settings form.** It requires the API key and stores it
  in config, and `drush cex` would commit it. Set `language_mapping` with drush.
- **`paragraphs_blokkli`'s settings form needs core `media`.** It loads the
  `media_type` storage unconditionally, so it returned 500 without media. Core
  `media` is enabled here, and chunk 04 adds the media types (F7).
- **Allowed paragraph types must be explicit.** For a field that allows every
  type (`target_bundles: null`), `pbGetFieldConfig` reports
  `allowedBundles: []`, and the editor treats that as none allowed. So
  `field_paragraphs` lists `text`, `blokkli_fragment` and `from_library` (F7).
  The library item's allowed types come from the paragraph types'
  `allow_library_conversion` setting, which is empty until chunk 04.
- **The installer doesn't create the private files directory**, and it logs a
  security warning about the missing `.htaccess`. So `drupal/private/.htaccess`
  is tracked (`.gitignore`: `/drupal/private/*` except that file), like the one
  Drupal writes into `config/sync`.
- **Core `comment` isn't needed.** `paragraphs_blokkli_comment` has its own
  `blokkli_comment` entity type. This corrects the spike's note.
- **`paragraphs_type_permissions` is left for chunk 04.** Once enabled, every
  role needs per-bundle permissions, including anonymous for SSR, so it belongs
  with the roles. The starterkit doesn't enable it.
- **Requirement warnings that stay:**
  - "Configuration files not protected" (from `skip_permissions_hardening`)
  - the Drupal 12 notice about `enable_html5_validation`
  - update notifications off
- **`drush graphql:dump graphql <file>`** (graphql 5.1) prints the schema SDL.
  Chunk 07's schema download can use it.
- **Routes.** The one-time audit requested `/<segment>/__audit` for the first
  segment of every route, 28 in all.
  - `layout_builder` went to Nuxt, and `navigation` needs it for its block
    layout, so it was added to nginx's Drupal list.
  - `node` and `blokkli` go to Nuxt by design. `/blokkli/library-item/{id}` (the
    library module rewrites the library item's canonical route there) is the
    frontend's page, as in the starterkit.

From the [SQLite spike](01-sqlite-spike.md) and
[chunk 02](02-ddev-and-repo-layout.md), applied here:

- `symfony/runtime` is allowed, and Twig is pinned to `~3.29.0` (F5).
- `paragraphs_library` requires `entity_usage` (`^2.0@beta`).
- The 11.4 `standard` setup ships no node types, so `page` comes from config.
- The edit state's fields (`current_index`, `mutations`, …) are enabled on the
  GraphQL server.
- The SQLite settings: `synchronous=NORMAL` and the memory backend for the
  entity cache bin.
- `.gitignore` is an allowlist under `drupal/`: settings includes must sit at
  tracked paths. With an empty submodule, the path repository breaks
  `composer install`. Don't run the module's own ddev inside the submodule.
  `settings.php` also ignores directories named `web` in extension discovery, in
  case the module's own test site exists.

### Verification (2026-09-26)

- `ddev drush si --existing-config -y` on no database and on an existing one.
  - Both succeed.
  - `settings.php` is unchanged (same checksum), `drush config:status` reports
    no differences, and there are no requirement errors.
  - The `blokkli_comment` and edit-state tables exist.
- `ddev drush uli` logs in through nginx.
  - `/en/admin`, `/de/admin`, `/de/node/add/page`, the GraphQL server form and
    every page under `/admin/config/content/blokkli` return 200.
  - Anonymous users get 403 on `/en/admin` and `/en/graphql`, and 200 on
    `/en/user/login`.
- **Schema.** The dump was compared with the adapter.
  - All 36 `addMutation` names from `src/modules/drupal/index.ts` and all 47
    mutation plugin ids are fields of `ParagraphsEditMutationState`.
  - All 13 feature gates are present: comments, notifications, agent, fragments,
    transform, library, search, conversions, import-existing, block-transfer,
    media-library, preview-grant and templates.
  - Media-library passes the schema check but fails at runtime until chunk 04.
  - Compared with `build/drupal-schema.graphql`, every blökkli type and every
    `pb*`/`paragraphsBlokkli*` root field matches. The only difference is the
    mutation `add_teaser_from_node_id`, the starterkit's example plugin (chunk
    04 ports it).
- **Editing.** On a throwaway page, the adapter's `add` mutation through
  `/de/graphql` succeeded. The `pbConfig` parts return the URL prefixes `/en`,
  `/de` and `/fr`, the available features and the field config.
- **Module symlink.** An edit to a `.graphqls` file in
  `drupal/paragraphs_blokkli` showed up in the schema after `drush cr`. It was
  reverted, and the submodule is clean.
- **Headers,** checked with a temporary probe that applies Drupal's
  reverse-proxy settings:
  - Through the router, the client IP is the host (`172.18.0.1`), not nginx or
    the router. The scheme is https, the host `blokkli.ddev.site`, the port 443.
  - A client's `Forwarded` header is ignored without an error, and the router
    replaces a client's own `X-Forwarded-For`.
  - An untrusted Host gets 400. An SSR-style request (`Host: localhost` plus
    `X-Forwarded-Host`) passes.
- **Guard.** `drush status` with `IS_DDEV_HOSTED=true` and no salt fails with
  the guard's message; with a salt it works.
- `ddev check-routes`: all rows pass.
- **Clean clone** of `d7b0b5e43` (`git clone --recurse-submodules`, another
  project name in `.ddev/config.local.yaml`):
  - `ddev start` installed the contrib modules through the `post-start` hook,
    and `DRUSH_OPTIONS_URI` is the clone's own URL.
  - `ddev drush si --existing-config -y` worked, `config:status` is clean, there
    are no requirement errors, and `ddev drush uli` logs in. The admin pages and
    `/de/graphql` work.
  - The first install of a fresh checkout logs one error, "Couldn't write
    .htaccess file" for `public://`: an early install step runs before
    `sites/default/files` exists. The directory and its `.htaccess` exist after
    the install, and reinstalls don't log it. Harmless (nginx ignores
    `.htaccess`).
  - After `bun install` in the container, all 38 `check-routes` rows pass, and
    `git status` stays clean.
