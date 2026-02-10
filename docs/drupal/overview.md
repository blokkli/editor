# Drupal Integration

blökkli provides a first-class integration with [Drupal](https://www.drupal.org)
and the [Paragraphs](https://www.drupal.org/project/paragraphs) module. The
integration consists of two parts:

1. **`paragraphs_blokkli`** — A Drupal module that exposes a GraphQL API for
   managing paragraphs through an immutable mutation system
2. **`@blokkli/editor/drupal`** — A Nuxt module that provides a ready-made
   adapter implementation consuming that GraphQL API

Together, they let you build a fully decoupled Nuxt frontend with a visual
WYSIWYG editing experience powered by Drupal.

## How it works

```
┌─────────────────────┐       GraphQL        ┌──────────────────────┐
│     Nuxt Frontend   │◄────────────────────►│    Drupal Backend    │
│                     │                       │                      │
│  BlokkliProvider    │   queries/mutations   │  paragraphs_blokkli  │
│  BlokkliField       │◄────────────────────►│  Edit State Entity   │
│  Block components   │                       │  Mutation Plugins    │
│  Drupal adapter     │                       │  GraphQL Schema      │
└─────────────────────┘                       └──────────────────────┘
```

- The **Drupal backend** manages content entities (nodes) with paragraph fields.
  The `paragraphs_blokkli` module provides a GraphQL API for all editing
  operations (add, move, delete, duplicate, etc.) using an immutable edit state.
- The **Nuxt frontend** renders the content and uses blökkli's editor. The
  Drupal adapter module translates all editor actions into GraphQL mutations.

## Key Concepts

### Edit State

When a user starts editing, `paragraphs_blokkli` creates an **Edit State**
entity that stores all mutations as a history. This gives you:

- **Undo/redo** — Navigate the mutation history
- **Preview** — See changes before publishing
- **Ownership** — Only one user edits at a time
- **Validation** — Drupal validates the result before publishing

When the user publishes, all mutations are replayed and applied to the actual
Drupal entities.

### GraphQL as the Contract

The entire communication between Nuxt and Drupal happens through GraphQL. The
Drupal module provides:

- Queries for loading edit state, configuration, and content
- Mutations for all paragraph operations
- Fragments for entity data

The Nuxt Drupal adapter automatically uses these operations — you don't need to
write any adapter code yourself.

### Two-Part Paragraph Structure

Each paragraph in a field has two parts in the GraphQL response:

1. **Metadata** — UUID, bundle name, options (from `paragraphsFieldItem`
   fragment)
2. **Props** — The actual paragraph content (from paragraph-specific fragments)

This separation allows blökkli to manage block identity and options
independently from the content data.

## Prerequisites

- **Drupal 10 or 11** with the Paragraphs module
- **Nuxt 3** with `nuxt-graphql-middleware`
- A GraphQL server module for Drupal (e.g., `graphql_core_schema`)

## Next Steps

- [Getting Started](/drupal/getting-started) — Set up the integration step by
  step
- [GraphQL Fragments](/drupal/graphql) — Required fragments and queries
- [Page Components](/drupal/pages) — Wire up BlokkliProvider with Drupal
  entities
- [Block Components](/drupal/blocks) — Create paragraph block components
- [Configuration](/drupal/configuration) — All module options and Drupal
  settings
