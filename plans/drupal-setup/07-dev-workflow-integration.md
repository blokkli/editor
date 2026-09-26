# 07: Dev workflow integration

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 06

## Goal

The full-stack loop is wired into the existing tooling and documented. A new
feature goes from PHP to schema to adapter to UI without leaving this repo.

## Tasks

- [x] Add `bun run drupal:schema`: run `drush cr`, then download the schema from
      the local site into `build/drupal-schema.graphql`. Point `graphqlEndpoint`
      in the root `nuxt.config.ts` at `blokkli.ddev.site` instead of
      `starterkit.ddev.site`.
- [x] Update CLAUDE.md:
  - [x] Add a "Drupal dev environment" section: `ddev start`, where things live,
        the schema loop, `drush cr` after PHP changes.
  - [x] Nuxt in ddev is a daemon: don't start it by hand.
- [x] Update the `drupal` skill:
  - [x] The schema now comes from the local site.
  - [x] Schema additions go into `drupal/paragraphs_blokkli` first.
- [x] Onboarding docs: clone with submodules, `bun install`, `ddev start`,
      ~~`ddev bake`~~ (chunk 05 adds it; the docs use `drush si` until then).
- [x] Document the submodule workflow: commit and push in
      `drupal/paragraphs_blokkli` (to drupal.org), then bump the pointer here.
- [x] Decide whether `scripts/verify.sh` gets Drupal gates, e.g. phpcs and
      phpstan for the custom modules: not yet, see Notes.

## Acceptance criteria

- A feature that touches both repos can be built and tested from this repo
  alone, and the steps are documented.

## Notes

### What was done (2026-09-26)

- **One schema file.** `bun run drupal:schema` runs `drush cr` and dumps the
  schema into `build/drupal-schema.graphql`. The root config and
  `playground-drupal` both use it; `playground-drupal/schema.graphql` is gone.
  - The first dump rewrote the whole file: `drush graphql:dump` prints the types
    in the order Drupal registers them, while the starterkit download was
    sorted. Later dumps only show real changes.
  - The root's `graphqlEndpoint` is `https://blokkli.ddev.site/en/graphql`. It
    isn't used for anything (`downloadSchema: false`).
- **The two playgrounds coexist** (the user, 2026-09-26): the mock playground
  and its E2E suite run on the host, the Drupal stack in ddev. The mock
  playground will be removed later, so no work went into moving it into the
  container.
  - `bun run verify` passes on the host and in the container. The absolute paths
    in the generated `.nuxt` files don't break either side.
  - `verify.sh` skips `typecheck:playground-drupal` (with a note) when
    `playground-drupal/.nuxt` doesn't exist, i.e. without ddev.
- **Docs:**
  - `CONTRIBUTING.md` (new) covers both playgrounds, the setup, the secrets,
    where things live, the loop for a feature across both repositories, the
    submodule and the checks.
  - The README got a short "Development" section that links to it.
  - CLAUDE.md got a "Drupal Dev Environment" section, and its commands and
    typecheck list mention both playgrounds.
  - The `drupal` and `typecheck` skills cover the schema loop and
    `typecheck:playground-drupal`.
- **No Drupal gates in `verify.sh` yet.** There's no custom PHP until
  `blokkli_playground` gets the example plugins in chunk 13g, which now has the
  task. `paragraphs_blokkli` is checked in its own repository.
- **The first `bun install` failure** is intermittent and upstream: one of three
  cold-cache installs in the container failed, always on `@nuxt/devtools` (bun
  1.3.14). `CONTRIBUTING.md` says to run it again.
- **Fixed on the way:** the chunk 06 `Paragraph/Video` component put a
  `<figcaption>` inside a link, which Vue warns about (invalid nesting, possible
  hydration errors). The root is now a `div` and the caption a `span`.
- **Not fixed:** `bun run dev:prepare` still rewrites
  `playground/app/options-schema.json` with English labels, because the mock
  playground only uses German labels in dev mode (`FORCE_GERMAN`). The docs say
  to revert it.
- **Pitfall:** editing `playground-drupal/nuxt.config.ts` restarts Nuxt at once.
  When the schema path changed before the new dump existed, the daemon loaded
  the old file, hit an invalid document and hung on the prompt. A
  `ddev nuxt restart` fixed it.

### Verification (2026-09-26)

- `bun run drupal:schema` in the container writes the file; `dev:prepare`
  reports "The Drupal GraphQL schema supports all features" for the root config.
- The daemon restarts cleanly: "All GraphQL documents are valid", all features
  supported. Anonymous `/en/node/1` is still a server-rendered 403.
- `bun run verify` in the container: all 8 gates pass. On the host,
  `typecheck:playground-drupal` and `typecheck:server` pass too.
- The skip path of the new gate, in a copy without `playground-drupal/.nuxt`:
  skipped with the note, exit 0.

### Carried over from earlier chunks

From [chunk 02](02-ddev-and-repo-layout.md) (2026-09-26), for the docs:

- **Submodule workflow:**
  - `.gitmodules` uses the https URL, so clones and the hosted server need no
    drupal.org account. Pushing needs SSH: chunk 02 set
    `remote set-url --push origin git@git.drupal.org:project/paragraphs_blokkli.git`
    in this clone. For every clone, a global
    `git config --global url."git@git.drupal.org:".pushInsteadOf "https://git.drupalcode.org/"`
    does the same.
  - `git submodule update` leaves the module on a detached HEAD. Before
    committing in it: `git -C drupal/paragraphs_blokkli switch 2.0.x` (or a
    feature branch).
  - Never run `git submodule update` from a hook or script: it would detach the
    branch someone is working on.
  - The module ships its own `.ddev` (project `paragraphs-blokkli`). `ddev`
    commands run from inside `drupal/paragraphs_blokkli` target that project,
    not this one.
- **Onboarding:**
  - Clone with `--recurse-submodules`, or run `git submodule update --init`.
    With an empty submodule, the `composer install` in ddev's `post-start` hook
    fails (from chunk 03 on, with the path repository).
  - Then `ddev start`, and `bun install` in the container (`ddev ssh`). All bun
    and node tooling runs there, as in the other ddev projects.
- **ddev commands to document:** `ddev nuxt [status|start|stop|restart|logs]`
  and `ddev check-routes`.
- **CLAUDE.md:** its commands (`bun run verify`, the typechecks, the mock
  playground's `bun run dev`) are written for the host today. Decide whether
  they move into the container too (`ddev exec bun run …`).

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **`drupal:schema`:** `/graphql` is admin-only, so dump the schema with drush
  instead of downloading it: `ddev drush graphql:dump graphql <file>`.
  `build/drupal-schema.graphql` stays generated, never edited by hand.
- **Onboarding:** after `ddev start`, run `ddev drush si --existing-config -y`
  and `ddev drush uli`. Optional secrets:
  `ddev dotenv set .ddev/.env.web --deepl-auth-key=…`, then `ddev restart`.
- **Config workflow:** change config, `ddev drush cex`, commit
  `drupal/config/sync`.
- **The first install of a fresh checkout** logs "Couldn't write .htaccess file"
  for `public://` once. Harmless; say so in the onboarding docs.
- **The first `bun install` in a fresh container fails** with "Fail extracting
  tarball from @nuxt/devtools", and a rerun installs the missing package. This
  happened in both clean-clone tests (chunks 02 and 03), so it's not a one-off.
  Look into it (bun 1.3.14) or document the rerun.

From [chunk 06](06-playground-drupal-app.md) (2026-09-26):

- **`bun run drupal:schema` exists** and writes
  `playground-drupal/schema.graphql` (with an absolute path; drush resolves
  relative ones against the Drupal root). Extend it for
  `build/drupal-schema.graphql` instead of adding a second script.
- **`typecheck:playground-drupal` needs the daemon's `.nuxt`**, so
  `bun run verify` runs in the container. `nuxi prepare playground-drupal` would
  clear the daemon's build dir.
- **`bun run dev:prepare`** regenerates `playground/app/options-schema.json`
  with English labels (`nuxi prepare` isn't dev mode). Don't commit that change.
