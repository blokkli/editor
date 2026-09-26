# 03: Drupal base site

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 02

## Goal

A Drupal 11 site that installs from config in one command, with
`paragraphs_blokkli`, GraphQL and three languages. `settings.php` is shaped so
that chunk 08 can override everything per sandbox.

## Tasks

- [ ] `drupal/composer.json` (chunk 02 created it with `core-recommended` ^11.4,
      drush 13 and the Twig pin). Add:
  - [ ] `paragraphs` and `entity_reference_revisions`
  - [ ] `graphql` ~5 and `graphql_core_schema`
  - [ ] `paragraphs_library`, `scheduler`, `search_api`
  - [ ] `masquerade`, `paragraphs_type_permissions`, `translatable_config_pages`
  - [ ] `deeplcom/deepl-php`. Check whether `paragraphs_blokkli_deepl` also
        needs tmgmt (the starterkit uses tmgmt with `tmgmt_deepl`).
  - [ ] A path repository for `./paragraphs_blokkli` with `symlink: true`, plus
        a `versions` override so feature branches still resolve as `2.0.x-dev`.
- [ ] `settings.php`:
  - [ ] Read everything from the environment: database, hash salt, file paths,
        trusted hosts, DeepL key, agent `auth_secret`.
  - [ ] No shared cache backend (no memcache or redis).
  - [ ] Leave one include point for the sandbox override (chunk 08).
  - [ ] Reverse proxy: nginx forwards `X-Forwarded-Host` and `X-Forwarded-Proto`
        (chunk 02). Set `reverse_proxy`, `reverse_proxy_addresses` and the
        trusted headers.
  - [ ] `skip_permissions_hardening = TRUE`: `settings.php` is tracked, and
        Drupal's hardening makes `sites/default` read-only, which breaks
        checkouts.
  - [ ] Set `DRUSH_OPTIONS_URI` (ddev doesn't when settings management is off;
        `drush status` shows `http://default`).
- [ ] Languages:
  - [ ] EN is the default, plus DE and FR, with `content_translation`.
  - [ ] Language negotiation by URL prefix (`en/`, `de/`, `fr/`), plus the
        GraphQL operation language negotiator the starterkit uses.
- [ ] GraphQL server `graphql` with schema `core_composable` at `/graphql`:
  - [ ] Extensions: `entity_query` plus
        `paragraphs_blokkli_{edit,agent,comment,deepl,library,scheduler,search,template,transform}`.
  - [ ] Enabled entity types: `paragraph`, `paragraphs_type`,
        `paragraphs_blokkli_edit_state`, `blokkli_paragraph_template`, `node`,
        `media`, `file`, `paragraphs_library_item`, `user`.
  - [ ] Reference: the starterkit's
        `drupal/config/default/graphql.graphql_servers.graphql.yml`.
- [ ] Enable all `paragraphs_blokkli` submodules. Set
      `paragraphs_blokkli.settings` (`enabled_types` is required, or edit state
      throws `BlokkliNotEnabledException`).
- [ ] `drush site:install --existing-config -y` works on an empty database.
- [ ] Extend `ddev check-routes` (`.ddev/commands/host/check-routes`) with the
      routes of the enabled modules, and compare the first path segment of every
      route from `ddev drush route` with the nginx Drupal path list.

## Acceptance criteria

- A fresh install from config works with one command.
- The `/graphql` schema contains every mutation the Drupal module knows (compare
  with the `addMutation(...)` list in `src/modules/drupal/index.ts`).
- A PHP change in `drupal/paragraphs_blokkli` takes effect after `drush cr`,
  with no reinstall.

## Notes

Found in the [SQLite spike](01-sqlite-spike.md) (2026-09-26, Drupal 11.4.7):

- **`symfony/runtime` must be allowed:**
  `"allow-plugins": {"symfony/runtime": true}`. `index.php` boots through
  `vendor/autoload_runtime.php`, which the plugin generates. Without it every
  web request fails.
- **Pin `twig/twig` to `~3.29.0`.** Core allows `^3.28.0`, and
  `core-recommended` 11.4.7 doesn't pin Twig. Twig 3.30.0 compiles `|escape` to
  `$this->escaper->escape(...)` with Drupal's argument list, so every template
  that escapes output throws a `TypeError` (`node/1` returns 500). Remove the
  pin once core fixes this (F5 in [findings.md](findings.md)).
- **`paragraphs_library` (paragraphs 1.23) requires `drupal/entity_usage`**
  (`^2.0@beta`, the starterkit's constraint).
- **The 11.4 `standard` profile ships no node types and doesn't enable
  `comment`.** Both have to come from config. The `comment` module must be
  enabled if the GraphQL server lists the `comment` entity type
  (graphql_core_schema throws otherwise), and blökkli comments build on core
  comments anyway.
- **GraphQL server fields:** the editor's fragments need the edit state's fields
  enabled in `schema_configuration.core_composable.fields` (`current_index`,
  `mutations`, `host_entity_type`, `host_entity_uuid`, …, as in the starterkit).
  Otherwise queries fail with "Cannot query field currentIndex".
- **`settings.php` for SQLite:** use the snippet under "SQLite settings to use"
  in chunk 01, including the memory backend for the entity cache bin.
- PHP 8.5 works (the kernel suite ran on 8.5.7).

From [chunk 02](02-ddev-and-repo-layout.md) (2026-09-26):

- **`.gitignore` is an allowlist under `drupal/`.** Tracked: `composer.*`,
  `config/`, `content/`, `web/modules/custom/`,
  `web/sites/default/settings.php`, `mocks.graphql`. Everything else under
  `web/` is ignored, including `web/sites/default/services.yml` and other
  `settings.*.php` files. Put tracked settings includes (the chunk 08 sandbox
  override) at a tracked path, or extend the allowlist.
- **The Composer path repository needs the submodule checked out.** On a clone
  without `--recurse-submodules`, `drupal/paragraphs_blokkli` is empty, and the
  `composer install` in ddev's `post-start` hook fails. That's only a warning,
  but say so in the onboarding docs (chunk 07).
- **Don't run the module's own ddev setup inside the submodule.**
  `drupal/paragraphs_blokkli` ships its own `.ddev` (project
  `paragraphs-blokkli`), so any `ddev` command run from inside it targets that
  project. Its `ddev poser` would also create a nested `web/core` there, which
  the path repository symlink would expose to Drupal's extension discovery.
