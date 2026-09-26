# 07: Dev workflow integration

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 06

## Goal

The full-stack loop is wired into the existing tooling and documented. A new
feature goes from PHP to schema to adapter to UI without leaving this repo.

## Tasks

- [ ] Add `bun run drupal:schema`: run `drush cr`, then download the schema from
      the local site into `build/drupal-schema.graphql`. Point `graphqlEndpoint`
      in the root `nuxt.config.ts` at `blokkli.ddev.site` instead of
      `starterkit.ddev.site`.
- [ ] Update CLAUDE.md:
  - [ ] Add a "Drupal dev environment" section: `ddev start`, where things live,
        the schema loop, `drush cr` after PHP changes.
  - [ ] Nuxt in ddev is a daemon: don't start it by hand.
- [ ] Update the `drupal` skill:
  - [ ] The schema now comes from the local site.
  - [ ] Schema additions go into `drupal/paragraphs_blokkli` first.
- [ ] Onboarding docs: clone with submodules, `bun install`, `ddev start`,
      `ddev bake`.
- [ ] Document the submodule workflow: commit and push in
      `drupal/paragraphs_blokkli` (to drupal.org), then bump the pointer here.
- [ ] Decide whether `scripts/verify.sh` gets Drupal gates, e.g. phpcs and
      phpstan for the custom modules.

## Acceptance criteria

- A feature that touches both repos can be built and tested from this repo
  alone, and the steps are documented.

## Notes

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
