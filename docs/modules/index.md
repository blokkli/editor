# Modules

blökkli ships a set of optional **modules** that add functionality on top of the
core editor — from a full Drupal backend integration to small building blocks
like a table of contents component.

Modules are enabled per project. You import the module factory from
`@blokkli/editor/<name>` and add it to the `blokkli.modules` array in your
`nuxt.config.ts`:

```typescript
import charts from '@blokkli/editor/charts'
import iframes from '@blokkli/editor/iframes'

export default defineNuxtConfig({
  modules: ['@blokkli/editor'],

  blokkli: {
    modules: [
      charts(),
      iframes({
        viewports: {
          mobile: { label: 'Mobile', width: 375 },
          desktop: { label: 'Desktop', width: 1440 },
        },
      }),
    ],
  },
})
```

Only the modules you enable contribute to your bundle — their runtime
dependencies are pre-bundled lazily, so an unused module costs nothing.

## Available modules

### Backend integrations

- [**Drupal**](/modules/drupal/overview) — first-class GraphQL adapter for
  Drupal and the Paragraphs module.

### Editing features

- [**Agent**](/modules/agent/overview) — an AI assistant inside the editor that
  reads, creates, edits, moves, and deletes blocks through natural language.
- [**Charts**](/modules/charts/) — data-driven charts (bar, pie, line, and more)
  with an extensible chart-type system.
- [**Iframes**](/modules/iframes/) — responsive iframe embeds with per-viewport
  height management.
- [**Readability**](/modules/readability/) — text readability analysis wired
  into the editor's Analyze feature.

### Components & configuration

- [**Table of Contents**](/modules/table-of-contents/) — a global
  `<BlokkliTableOfContents>` component built from your page's blocks.
- [**Tailwind**](/modules/tailwind/) — exposes blökkli's Tailwind config so your
  project can reuse its spacing, colors, and other design tokens.

## Authoring your own module

Modules use the same API the built-in ones are built on. See
[Authoring a Module](/modules/authoring/) to build your own — registering CSS,
icons, complex option types, adapter extensions, and more.
