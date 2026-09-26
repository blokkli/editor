# Contributing

## Two playgrounds

This repository has two apps to develop the editor in. They coexist; the mock
playground will be removed at some point.

- **The mock playground** (`playground/`) uses a mock adapter that keeps
  everything in local storage. It runs on the host, and the E2E suite runs
  against it.
- **The Drupal playground** is a Drupal 11 site with
  [Paragraphs blökkli](https://www.drupal.org/project/paragraphs_blokkli)
  (`drupal/`) and a Nuxt app that uses the Drupal adapter
  (`playground-drupal/`). Both run in [ddev](https://ddev.com), at
  https://blokkli.ddev.site.

`node_modules` is shared between the host and the container. On Linux, that's
fine either way. On macOS, the native binaries only match the side that ran
`bun install`.

## The mock playground

```bash
bun install
bun run dev:prepare
bun run dev          # http://localhost:3000
```

## The Drupal playground

### Setup

1. Clone with the submodule:
   `git clone --recurse-submodules https://github.com/blokkli/editor.git`. In an
   existing clone: `git submodule update --init`. Composer symlinks
   `drupal/paragraphs_blokkli` into the site, and the `composer install` in
   `ddev start` fails while it's empty.
2. `ddev start`
3. `ddev ssh`, then `bun install`. All bun and node tooling for this stack runs
   in the container. The first install sometimes fails with "Fail extracting
   tarball from @nuxt/devtools" (bun 1.3.14); run it again.
4. `ddev drush si --existing-config -y` installs the site from
   `drupal/config/sync`. The first install logs "Couldn't write .htaccess file"
   for `public://` once, which is harmless.
5. `ddev drush uli` prints a login link. Create a page at `/en/node/add/page`.

Nuxt runs as a ddev daemon and starts on its own once `node_modules` exists.
Don't run `bun run dev` for it: use
`ddev nuxt [status|start|stop|restart|logs]`.

Optional secrets go in `.ddev/.env.web` (gitignored). Run `ddev restart` after
changing them.

```bash
ddev dotenv set .ddev/.env.web --deepl-auth-key=…
ddev dotenv set .ddev/.env.web --nuxt-blokkli-agent-auth-secret=<random string>
ddev dotenv set .ddev/.env.web --nuxt-blokkli-agent-api-key=…
```

- The agent needs the auth secret. Without an API key, only its mock provider
  works.
- Don't enter the DeepL key in Drupal's settings form: it would end up in the
  exported config.

### Where things live

| Path                          | What                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| `drupal/`                     | Composer root. `config/sync` is the config, `web/` the docroot. |
| `drupal/paragraphs_blokkli/`  | The Drupal module, a git submodule of the drupal.org repo.      |
| `playground-drupal/`          | The Nuxt app.                                                   |
| `build/drupal-schema.graphql` | The site's GraphQL schema. Generated, never edited by hand.     |
| `.ddev/`                      | nginx routing, the Nuxt daemon, `ddev nuxt`, `check-routes`.    |
| `plans/drupal-setup/`         | The plan for this setup and the public sandbox.                 |

### A feature across both repositories

1. Change the module in `drupal/paragraphs_blokkli`. It's symlinked into the
   site, so changes are live. After PHP changes, run `ddev drush cr`.
2. `bun run drupal:schema` (in the container) rebuilds Drupal's caches and dumps
   the schema into `build/drupal-schema.graphql`. The Nuxt daemon restarts and
   detects the available features again.
3. `bun run dev:prepare` regenerates the types for the Drupal module in `src/`.
   It also rewrites `playground/app/options-schema.json` with English labels;
   don't commit that.
4. Change the adapter and the UI in `src/`. playground-drupal hot-reloads.
5. Export config changes with `ddev drush cex -y` and commit
   `drupal/config/sync`.
6. Run `bun run verify`. After nginx changes, also `ddev check-routes`.
7. Commit the module change in the submodule and push it to drupal.org. Then
   commit the new submodule pointer here.

### The submodule

- `git submodule update` leaves the module on a detached HEAD. Before committing
  in it, switch to a branch: `git -C drupal/paragraphs_blokkli switch 2.0.x` (or
  a feature branch).
- `.gitmodules` uses the https URL, so cloning needs no drupal.org account.
  Pushing needs SSH:
  `git config --global url."git@git.drupal.org:".pushInsteadOf "https://git.drupalcode.org/"`.
- Don't run `git submodule update` from hooks or scripts: it would detach the
  branch someone is working on.
- The module has its own `.ddev` (project `paragraphs-blokkli`). ddev commands
  run inside `drupal/paragraphs_blokkli` target that project, not this one.

## Checks

- `bun run verify` runs the formatters, the linters, all typechecks and the unit
  tests. It works on the host and in the container.
  `typecheck:playground-drupal` needs the `.nuxt` folder that the Nuxt daemon
  generates, and is skipped without it.
- `bun run verify -- e2e` runs the E2E suite against the mock playground on
  `localhost:3000`, on the host.
