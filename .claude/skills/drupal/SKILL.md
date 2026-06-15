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
│       └── BlokkliDrupalEditTemplate.vue  # Template editing wrapper
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

```typescript
blokkli: {
  modules: {
    drupal: {
      templateEditRouteName?: string  // Nuxt route for template editing (needs :uuid param)
    }
  }
}
```

## Adapter

The adapter (`runtime/adapter/index.ts`) implements `FullBlokkliAdapter`. All
mutations and queries go through GraphQL. Methods are conditionally registered
based on what the schema supports — the adapter only exposes operations that the
backend can handle.

## Component

`BlokkliDrupalEditTemplate` — Loads a template entity via GraphQL and wraps it
with `BlokkliProvider` + `BlokkliField` for editing. Used on the template edit
route.

## GraphQL Integration

Requires `nuxt-graphql-middleware` to be loaded **before** `@blokkli/editor` in
the Nuxt modules config. GraphQL documents in `graphql/` are registered
conditionally based on schema introspection — roughly 30+ mutations and a dozen
feature-specific query/fragment sets.

## GraphQL Schema and Type Generation

The Drupal GraphQL schema is stored at `build/drupal-schema.graphql`. This is
the source of truth for type generation — the root `nuxt.config.ts` references
it via `graphqlMiddleware.schemaPath`.

**When adding or modifying GraphQL mutations/queries:**

1. **Always read the schema first** — check `build/drupal-schema.graphql` to see
   the exact field names, types, and argument names for the mutation/query
   you're implementing. Do NOT guess field names.
2. Write the `.graphql` document in `src/modules/drupal/graphql/` matching the
   schema exactly
3. Run `bun run dev:prepare` to regenerate types from the schema
4. The `Mutation` and `Query` TypeScript types (from
   `#nuxt-graphql-middleware/operation-types`) are generated from this schema —
   after `dev:prepare`, new operations will be recognized

**Adapter pattern for GraphQL operations:**

- Use `hasMutation('operationName')` / `hasQuery('operationName')` to
  conditionally register adapter methods
- Call `useGraphqlMutation(name, variables)` or
  `useGraphqlQuery(name, variables)`
- Map responses: `.then((v) => v.data.result.success)` for standard mutation
  results
