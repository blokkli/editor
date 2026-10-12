---
name: blokkli-v2-migration
description: >-
  Migrate a project from blökkli 1.x to 2.x: @blokkli/editor (Nuxt) and
  paragraphs_blokkli (Drupal) together. Use when the user asks to upgrade
  blökkli to v2, or when a project on @blokkli/editor ^1 fails after the version
  bump (stale GraphQL schema, missing fragments, adapter errors).
license: MIT
compatibility: >-
  Requires a Nuxt project using @blokkli/editor ^1 with nuxt-graphql-middleware,
  and access to its Drupal backend (composer, drush) running paragraphs_blokkli
  1.x.
metadata:
  author: blokkli
  version: '1.0.3'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li
disable-model-invocation: true
---

# blökkli V1 → V2 migration

The migration is split into phases. Each phase has its own instructions file.
Only read the file of the phase you are currently working on.

| Phase | File                                             | Done when                                                                    |
| ----- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1     | [phases/1-drupal.md](phases/1-drupal.md)         | Update hooks ran, config exported, GraphQL schema contains the new V2 types  |
| 2     | [phases/2-nuxt.md](phases/2-nuxt.md)             | Dev server starts, typecheck passes                                          |
| 3     | [phases/3-components.md](phases/3-components.md) | Every paragraph component is migrated (can be spread over multiple sessions) |

Phase 3 is optional and incremental: after phase 2, the project already works
with V2. Phase 3 only removes deprecated usage and enables better live previews.

## Why Drupal first

You must update _both_ the Nuxt module and the Drupal module at the same time.
The frontend depends on the GraphQL schema provided by Drupal: the blökkli
`drupal` module decides which features and GraphQL documents to enable based on
the types available in the schema.

The initial npm/bun/yarn install of `@blokkli/editor` 2.x **will** fail, because
the `postinstall` hook runs, which tries to build GraphQL documents and types,
while the `schema.graphql` on disk is **stale**. Therefore:

1. Migrate Drupal (phase 1) and clear Drupal caches.
2. Bump `@blokkli/editor` and install with lifecycle scripts disabled (e.g.
   `npm install --ignore-scripts`).
3. Start the dev server once to download the latest GraphQL schema. This will
   likely still fail, since the frontend code has not been migrated yet. That's
   expected; continue with phase 2.

## Progress file

At the start of **every** session, check whether `BLOKKLI_V2_MIGRATION.md`
exists in the project root.

- If it exists: read it and continue where the previous session stopped.
- If not: create it with this structure:

```markdown
# blökkli V2 migration

## Phases

- [ ] 1: Drupal
- [ ] 2: Nuxt
- [ ] 3: Paragraph components

## Paragraph components

<!-- Phase 3: one line per component, checked when migrated. -->

## Tell the developer

<!-- Everything the developer needs to decide or do themselves. -->
```

Keep it up to date as you go:

- Check off a phase only once its "done when" criterion is met.
- Whenever an instruction says "let the developer know", add an entry to **Tell
  the developer** instead of only mentioning it in chat. Chat output gets lost
  over a long session; this file doesn't.

When all phases are done, show the developer the **Tell the developer** list and
the follow-ups below. The developer decides whether to delete the file.

## Follow-ups (not part of the migration)

These are new V2 features. Don't implement them during the migration; add them
to **Tell the developer** as suggestions.

- **Paragraph icons**: `defineBlokkli({ editor: { icon: 'bk_mdi_image' } })` can
  reference thousands of Material Design Icons, which blökkli bundles
  automatically. This can potentially replace a lot of custom `icon.svg` files.
- **Paragraph preview images**: blökkli picks up an `image.png` or `image.jpg`
  in the same folder as a `defineBlokkli` component. It's rendered at 300x200 in
  the editor, so the suggested size is 600x400 (crisp on 2x DPI screens).
- **Templates**: see the `blokkli-setup-templates` skill.
- **Host entity options**: see the `blokkli-setup-host-options` skill.
