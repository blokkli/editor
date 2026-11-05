---
description:
  Reference for the blökkli Drupal module — GraphQL-based adapter, schema-driven
  feature detection, and template editing
---

# Drupal Module Skill

The Drupal module (`src/modules/drupal/`) is a blökkli sub-module that provides
a GraphQL-based adapter implementation for Drupal backends using the
[Paragraphs blökkli](https://www.drupal.org/project/paragraphs_blokkli) Drupal
module. It communicates via `nuxt-graphql-middleware`.

## Module Structure

```
src/modules/drupal/
├── index.ts              # Module entry: defaults, schema introspection, GraphQL registration
├── runtime/
│   ├── adapter/
│   │   └── index.ts      # Full adapter implementation (~1400 lines)
│   └── components/
│       ├── BlokkliDrupalEditLibraryItem/  # A library item's page
│       └── BlokkliDrupalEditTemplate/     # A template's page
└── graphql/              # GraphQL queries, mutations, fragments
```

## What It Does

**Sets Drupal-specific defaults** (via `alterOptions`):

- `itemEntityType` = `'paragraph'`
- `templateEntityType` = `'blokkli_paragraph_template'`
- Registers default component patterns for Paragraph, Node, TaxonomyTerm, etc.
- Sets up bundle-to-GraphQL fragment mapping

**Introspects the GraphQL schema** (during `setup`):

- Detects which mutations, types, and queries exist in the backend
- Conditionally registers GraphQL documents and enables/disables features
- This allows graceful degradation when a Drupal site doesn't support certain
  features

## Configuration

The module has no options: `modules: [drupal()]`.

## Adapter

The adapter (`runtime/adapter/index.ts`) implements `FullBlokkliAdapter`. All
mutations and queries go through GraphQL. Methods are conditionally registered
based on what the schema supports — the adapter only exposes operations that the
backend can handle.

## Bundles

- **A bundle is known by its entity type and its name.** A content type and a
  paragraph type can have the same name, and fields of the same name. The field
  configs (`fieldConfig`, `editableFieldConfig`, `droppableFieldConfig`) list
  the host's fields and every paragraph type's: look a field up by entity type,
  bundle and name (in the editor, through the `types` provider). A function that
  takes a bundle alone means a paragraph type: don't call it with the host's.
- **Kernel tests in the module** that cover the host's fields and a paragraph
  type's give both bundles the same name and the same field names, so that a
  lookup without the entity type fails.

## Components

Library items and templates are edited on their canonical URLs, pages of the
frontend by the entity's ID: `/blokkli/library-item/{id}` and
`/blokkli/template/{id}`. Drupal links there, and the adapter builds the same
URLs (`getLibraryItemEditUrl`, `templatesGetEditUrl`).

- `BlokkliDrupalEditLibraryItem` (`id`) — loads a library item
  (`paragraphsBlokkliLibraryItemGet`) and wraps it with `BlokkliProvider` +
  `BlokkliField`; its slot renders above the paragraph.
- `BlokkliDrupalEditTemplate` (`id`) — the same for a template
  (`paragraphsBlokkliTemplateGet`).

Both answer 404 when the entity doesn't exist or the user may not view it or use
blökkli.

## GraphQL Integration

Requires `nuxt-graphql-middleware` to be loaded **before** `@blokkli/editor` in
the Nuxt modules config. GraphQL documents in `graphql/` are registered
conditionally based on schema introspection — roughly 30+ mutations and a dozen
feature-specific query/fragment sets.

## GraphQL Schema and Type Generation

The Drupal GraphQL schema is stored at `build/drupal-schema.graphql`. This is
the source of truth for type generation — the root `nuxt.config.ts` references
it via `graphqlMiddleware.schemaPath`, and so does `sandbox/frontend`.

It's generated from the local ddev site (`sandbox/drupal/`, see CLAUDE.md's
Drupal Dev Environment section): `bun run drupal:schema` in the container runs
`drush cr` and dumps the schema. **Never edit the file by hand.**

**When adding or modifying GraphQL mutations/queries:**

1. **Always read the schema first** — check `build/drupal-schema.graphql` to see
   the exact field names, types, and argument names for the mutation/query
   you're implementing. Do NOT guess field names.
2. If the schema lacks something, add it to the Drupal module first:
   `sandbox/drupal/paragraphs_blokkli`, a git submodule of the drupal.org
   repository (symlinked into the site). Run `ddev drush cr` after PHP changes,
   then `bun run drupal:schema`. Don't commit or push in the submodule unless
   asked.
3. Write the `.graphql` document in `src/modules/drupal/graphql/` matching the
   schema exactly
4. Run `bun run dev:prepare` to regenerate types from the schema
5. The `Mutation` and `Query` TypeScript types (from
   `#nuxt-graphql-middleware/operation-types`) are generated from this schema —
   after `dev:prepare`, new operations will be recognized
6. Try it against real Drupal in the sandbox (`sandbox/frontend`)
   (https://blokkli.ddev.site). Its Nuxt runs as a ddev daemon and restarts on
   its own when the schema changes.

**Adapter pattern for GraphQL operations:**

- Use `hasMutation('operationName')` / `hasQuery('operationName')` to
  conditionally register adapter methods
- Call `useGraphqlMutation(name, variables)` or
  `useGraphqlQuery(name, variables)`
- Map responses: `.then((v) => v.data.result.success)` for standard mutation
  results
