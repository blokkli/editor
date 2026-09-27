# 13a: Base setup skill

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 06
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

What chunks 03, 04 and 06 took to get blökkli running on Drupal, written up as
the skill an agent needs to add blökkli to a Drupal and Nuxt project. It's also
the first skill written to the conventions in [chunk 13](13-editor-features.md),
before the feature sub-chunks use them.

## Tasks

- [x] `skills/blokkli-setup-drupal/SKILL.md`:
  - [x] Drupal:
    - `paragraphs_blokkli` and `paragraphs_blokkli_graphql`
    - the graphql_core_schema server: extensions, `bundles`, `fields`
    - `paragraphs_blokkli.settings`: `enabled_types`, the media bundles, the
      image style
    - `pb_entity_mapping` for media
    - allowed paragraph types listed explicitly on every paragraphs field
    - permissions: GraphQL access, the blökkli edit permissions
  - [x] Nuxt:
    - `nuxt-graphql-middleware` before blökkli, and the `drupal()` module
    - the server options: one endpoint per language, forwarded cookies and
      headers, Drupal's status passed through
    - `blokkli.editAdapter.ts` wrapping `#blokkli/drupal-adapter`
    - the fragments `paragraph` and `pbMutatedEntity`, the `paragraph<Pascal>`
      naming
    - `BlokkliProvider` and `BlokkliField` on the host, the library item and
      template routes
    - SSR for visitors, the SPA for editing
  - [x] How to check the result, and the traps (F7, F8, F9, the fragment naming,
        `…Unexposed` types).
- [x] Compare with `docs/modules/drupal/`: link to it instead of repeating it,
      and note the gaps in the docs.
- [x] Bring the existing skills' frontmatter in line with the conventions. Their
      content is reviewed in 13c, 13d, 13e and 13i.

## Acceptance criteria

- The skill exists and follows the conventions in chunk 13.

## Notes

### What was done (2026-09-26)

- **`skills/blokkli-setup-drupal/SKILL.md`** covers:
  - the order (Drupal, schema, Nuxt)
  - one origin for both, and the paths Drupal needs
  - the modules, paragraphs fields, blökkli settings and entity mappings
  - the GraphQL server, with a known-good config excerpt
  - permissions, getting the schema into Nuxt, the Nuxt config
  - a short section for projects without a decoupled setup (language endpoint,
    forwarded headers, status codes)
  - the fragments, components and routes, the edit adapter
  - how to check the result, and a table of symptoms and causes
- **Fixed in the docs** (`docs/modules/drupal/`), since they were wrong:
  - `getting-started.md` put `@blokkli/editor` before `nuxt-graphql-middleware`;
    the Drupal module throws then.
  - The settings page is `/admin/config/content/blokkli`, not `…/settings`
    (three places).
  - `paragraphs_blokkli_comment` doesn't depend on core `comment`.
- **The docs still lack** what the skill now covers: the same-origin
  requirement, the GraphQL server config (extensions, `bundles`, `fields`),
  GraphQL access, the explicit allowed types, core `media` for the settings
  form, the library item route, and the header forwarding. A docs page for them
  is a follow-up, not part of this plan.
- **Frontmatter:** all five existing skills already had the conventions' fields.
  `blokkli-setup-scheduling`'s (now `blokkli-setup-publishing`) description got
  its "Use when" triggers; its content is 13e's.
- **Verified against the code** while writing: `defineBlokkliEditAdapter` isn't
  auto-imported (the example imports it), the module-order error message, the
  `blokkliEditing` query param, the library item URL the adapter builds, the
  permission names and the admin routes.

### Sources

- **Sources:** the Notes of chunks 03, 04 and 06; F7–F9 in
  [findings.md](findings.md); the starterkit (the README's reference list);
  `docs/modules/drupal/`.
