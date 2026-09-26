# 13: Editor features

- **Status:** todo (done when 13a–13i are done)
- **Milestone:** M1 Local dev site
- **Depends on:** 04, 06; [14a](14a-demo-concept.md) for the content model
  (done)

## Goal

The Drupal site supports every blökkli feature, verified in the editor of
`playground-drupal`. Along the way, the setup of every feature is written up as
a skill in `./skills`. The skills ship with `@blokkli/editor`, for agents that
set the same features up in other projects.

Split off from chunk 04 on 2026-09-26, and split into the sub-chunks below the
same day: as one plan it was too big. Each sub-chunk gets its own plan and
review pass.

## Sub-chunks

| #                                 | Scope                                                                            | Skills                                                                                   | Depends on   |
| --------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------ |
| [13a](13a-base-setup-skill.md)    | The base setup of chunks 03, 04 and 06, written up                               | new `blokkli-setup-drupal`                                                               | 06           |
| [13b](13b-block-types.md)         | Everyday and structure blocks, the image credit, options                         | new `blokkli-add-block-type`                                                             | 14a          |
| [13c](13c-hosts.md)               | News, events, offices, the page sidebar, config pages, teaser and contact blocks | review `blokkli-setup-host-options`; new `blokkli-add-host`                              | 13b          |
| [13d](13d-reusable-content.md)    | Library, fragments, templates                                                    | review `blokkli-setup-templates`; new `blokkli-setup-library`, `blokkli-setup-fragments` | 13b, 13c     |
| [13e](13e-publishing.md)          | Scheduling, revisions, preview grants                                            | review `blokkli-setup-scheduling`                                                        | 13c          |
| [13f](13f-translation.md)         | Translation settings, DeepL, outdated translations, the language switch          | new `blokkli-setup-translations`                                                         | 13c          |
| [13g](13g-search-and-plugins.md)  | Search, the example plugins in `blokkli_playground`                              | new `blokkli-setup-search`, `blokkli-write-drupal-plugin`                                | 13c, 13d     |
| [13h](13h-collaboration-roles.md) | Comments, notifications, roles and permissions                                   | new `blokkli-setup-permissions`                                                          | 13b–13g, 13i |
| [13i](13i-agent-and-modules.md)   | The agent, charts, iframes, table of contents, analyzers                         | review `blokkli-analyze`; new `blokkli-setup-agent`, `blokkli-setup-charts`              | 13b          |
| [13j](13j-skill-tests.md)         | Test every skill with an agent that only has the skill                           | fixes to all of them                                                                     | 13a–13i      |

**Order:**

1. 13a any time: it adds nothing to the site.
2. [14a](14a-demo-concept.md), the demo concept, before 13b. The block types,
   bundles and fields come from the demo's content model, so that nothing gets
   added that the demo doesn't need (the user, 2026-09-26). Done: a fictional
   town, Blockingen/Bloquens; its "Which sub-chunk builds what" table is the
   source for 13b–13i.
3. 13b, then 13c. 13i only needs 13b.
4. 13d, 13e, 13f and 13g in any order (13g after 13d).
5. 13h last among the Drupal parts: per-bundle permissions need every bundle.
6. 13j at the end.

## Skills

- **Where:** `skills/<name>/SKILL.md`, shipped in the npm package (`files` in
  `package.json`).
- **Audience:** an agent in a consumer project (Nuxt and Drupal, often based on
  the starterkit), not in this repo.
  - No `playground-drupal` paths and no ddev commands of this repo; plain
    `drush`.
  - Examples assume Nuxt's auto-imports, as most projects use them.
- **Frontmatter,** as in the existing skills: `name`, a `description` with the
  "Use when …" triggers, `license: MIT`, `compatibility` and `metadata`
  (`author`, `version`, `targets`, `docs`).
- **Content:**
  - Drupal: modules, config, the GraphQL server (extension, `bundles`,
    `fields`), permissions. For permissions, tell the developer who needs which,
    and don't assign them yourself (as `blokkli-setup-templates` does).
  - Frontend: `nuxt.config.ts`, components, routes, the edit adapter.
  - How to check the result: the type is in the schema, and the Drupal module no
    longer lists the feature in its "Features disabled because the Drupal
    GraphQL schema lacks support for them" log line. That line is new (chunk
    06), so also say how to check without it.
  - The traps we hit, described by their symptom (the F-numbers in
    [findings.md](findings.md) are internal).
  - Links to the docs (docs.blokk.li) instead of repeating them.
- **Written to the best of our knowledge** in each sub-chunk, and tested
  together in 13j (the user, 2026-09-26).
- **Commit each sub-chunk separately,** so that 13j can use the commit before a
  sub-chunk as the baseline for its skill test.

## Acceptance criteria

- The feature matrix under Notes lists every blökkli feature and adapter method,
  and the bundle or config that exercises it. Each sub-chunk fills in its rows.
- The `playground-drupal` coverage check (chunk 06) reports no feature disabled
  for lack of backend support.
- Every skill planned in the sub-chunks exists.

## Notes

### For every sub-chunk

From [chunk 03](03-drupal-base-site.md), [04](04-base-content-model.md) and
[06](06-playground-drupal-app.md) (2026-09-26):

- **Config changes** go through `ddev drush cex` into `drupal/config/sync`.
  Reinstall with `ddev drush si --existing-config -y` to check that the export
  is complete, then `drush config:status` must be clean.
- **List allowed paragraph types explicitly** on every paragraphs field. For
  `target_bundles: null` the module reports no allowed types (F7). The library
  item's types come from each paragraph type's `allow_library_conversion`.
- **The GraphQL server's `bundles` key** must list every bundle, or
  graphql_core_schema generates no type for it (`…Unexposed`). Add new fields to
  its `fields` list too. Then `bun run drupal:schema`.
- **A block type with a required field can only be added through the Drupal
  form.** `add` validates the new paragraph but can't take values (F7). Keep
  that in mind for the `addBehaviour` of new block types.
- **New block types** need a component in
  `playground-drupal/app/components/Paragraph/<Pascal>/` (`index.vue` and
  `fragment.graphql` with `paragraph<Pascal>`), a spread in
  `Paragraph/fragment.paragraph.graphql`, and, if library items may hold them,
  one in `Paragraph/FromLibrary/fragment.graphql`.

### Feature matrix

To be filled in by the sub-chunks. The features that the Drupal module gates on
the schema, and where they're set up:

| Feature         | Sub-chunk | Exercised by                                                                  |
| --------------- | --------- | ----------------------------------------------------------------------------- |
| media-library   | 04        | the image, video and button blocks; media types image, remote video, document |
| fragments       | 13d       | "upcoming events", "latest news"; the table of contents (13i)                 |
| library         | 13d       | emergency numbers, "what goes into which bin", "stay informed"                |
| templates       | 13d       | a service page; default contents for new columns                              |
| import-existing | 13c       | copying blocks from one service page to another                               |
| block-transfer  | 13c       | moving blocks between pages                                                   |
| preview-grant   | 13e       | previewing unpublished changes on a phone                                     |
| transform       | 13g       | search and replace, e.g. a renamed office                                     |
| conversions     | 13g       | text ↔ title, button → text                                                   |
| search          | 13g       | offices, events, news, pages, media, library                                  |
| comments        | 13h       | the head of the department reviews a page                                     |
| notifications   | 13h       | comments and mentions                                                         |
| agent           | 13i       | editing a page with the agent                                                 |

Also: publishing and scheduling (13e), translations (13f), options and complex
options (13b, 13i), host options (13c), analyze (06, 13i). The other editor
features need no backend config; add them once they're checked in the editor.
