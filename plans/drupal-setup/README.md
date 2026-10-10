# Drupal setup: what's still open

The sandbox works locally: the Drupal site, its Nuxt app, the control app and
the sandboxes. How it's set up: the `sandbox` skill (`.claude/skills/sandbox/`)
and `CONTRIBUTING.md`. This folder only tracks what's still missing; done work
is removed.

| #   | Chunk                                | Status          |
| --- | ------------------------------------ | --------------- |
| 12  | [Hosted deploy](12-hosted-deploy.md) | todo            |
| 13j | [Skill tests](13j-skill-tests.md)    | todo (deferred) |

Statuses: `todo`, `in progress`.

## Smaller items

- **Asking for a premium sandbox.** Outside premium sandboxes, the welcome
  page's agent task is a teaser without a contact. Asking for one should become
  an automated process, e.g. a form with a name and an email address (the user,
  2026-10-06).
- **The module's Tailwind pass scans the whole project.** The "Module Utilities"
  in `src/build/templates/definitions/styles.ts` import Tailwind's utilities
  with auto-detection on, so they scan the consumer project's working directory.
  Here, the mock playground's dev CSS picks up candidates from `sandbox/`. Only
  extra CSS, and dev-only. The fix: `source(none)` plus the explicit `@source`
  paths; diff the generated CSS.
- **The Drupal docs** (`docs/modules/drupal/`) lack what the
  `blokkli-setup-drupal` skill covers: the same-origin requirement, the GraphQL
  server config (extensions, `bundles`, `fields`), GraphQL access, the explicit
  allowed types, core `media` for the settings form, the library item route, and
  the header forwarding.

## Upstream bugs

[findings.md](findings.md): bugs in `paragraphs_blokkli`, `@blokkli/editor` and
other projects, found along the way and fixed separately.

## Working on this plan

- Set a chunk to `in progress` when you start it, in its file and above.
- Tick tasks as you go. Write findings and deviations under "Notes".
- When a chunk is done, move what's worth keeping into the `sandbox` skill, the
  code or `CONTRIBUTING.md`, then delete the chunk.
- A bug that belongs in another project goes into [findings.md](findings.md).
