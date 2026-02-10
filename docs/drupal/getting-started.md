# Getting Started with Drupal

This guide walks you through setting up blökkli with a Drupal backend.

## Step 1: Install the Drupal Module

Install and enable the `paragraphs_blokkli` module and its GraphQL submodule:

```bash
composer require drupal/paragraphs_blokkli
drush en paragraphs_blokkli paragraphs_blokkli_graphql
```

### Enable Optional Submodules

Enable additional submodules based on your needs:

| Submodule                       | Purpose                             |
| ------------------------------- | ----------------------------------- |
| `paragraphs_blokkli_graphql`    | GraphQL API (required)              |
| `paragraphs_blokkli_library`    | Reusable paragraph library          |
| `paragraphs_blokkli_comment`    | Review comments on edit states      |
| `paragraphs_blokkli_search`     | Content search in the editor        |
| `paragraphs_blokkli_conversion` | Convert between paragraph types     |
| `paragraphs_blokkli_transform`  | Batch transform plugins             |
| `paragraphs_blokkli_template`   | Paragraph templates                 |
| `paragraphs_blokkli_scheduler`  | Schedule changes for future publish |
| `paragraphs_blokkli_fragments`  | Fragment support                    |
| `paragraphs_blokkli_agent`      | AI agent conversation persistence   |

## Step 2: Configure Drupal Permissions

Assign the following permissions to your editor role at
`/admin/people/permissions`:

| Permission                                        | Purpose                        |
| ------------------------------------------------- | ------------------------------ |
| `view paragraphs blokkli edit state`              | View edit states               |
| `create paragraphs blokkli edit state`            | Create new edit states         |
| `edit paragraphs blokkli edit state`              | Make edits (add, move, delete) |
| `review paragraphs blokkli edit state`            | Review and publish changes     |
| `take ownership of paragraphs blokkli edit state` | Transfer ownership             |

## Step 3: Configure the Drupal Module

Go to `/admin/config/content/blokkli/settings` and:

- Enable the entity types and bundles that should be editable (e.g., Node: Page)
- Configure media bundles for image and video uploads

If you use the media library or content search features, configure entity
mappings at `/admin/config/content/blokkli/entity-mapping` to map media types to
paragraph types.

## Step 4: Install the Nuxt Module

In your Nuxt project, install blökkli and the GraphQL middleware:

```bash
npm install @blokkli/editor nuxt-graphql-middleware
```

## Step 5: Configure Nuxt

Add the blökkli module and the Drupal integration to your `nuxt.config.ts`:

::: code-group

```typescript [~/nuxt.config.ts]
import drupal from '@blokkli/editor/drupal'

export default defineNuxtConfig({
  modules: ['@blokkli/editor', 'nuxt-graphql-middleware'],

  blokkli: {
    modules: [
      drupal({
        // Optional: route name for editing template entities
        templateEditRouteName: 'blokkli-template',
      }),
    ],

    // Your block component patterns
    pattern: ['~/components/Paragraph/**/*.vue'],
  },

  graphqlMiddleware: {
    graphqlEndpoint: process.env.DRUPAL_GRAPHQL_ENDPOINT,
    downloadSchema: process.env.NODE_ENV === 'development',
  },
})
```

:::

The Drupal module automatically sets these defaults for you:

- `itemEntityType: 'paragraph'`
- `templateEntityType: 'blokkli_paragraph_template'`
- `fromLibraryBlockBundle: 'from_library'`

It also configures `getBundlePropsType` to generate types like
`ParagraphTextFragment` from the bundle name `text`.

## Step 6: Create the Required GraphQL Fragments

The module provides most GraphQL fragments (including `blokkliProps` and
`paragraphsFieldItem`), but you need to create a few project-specific ones. See
[GraphQL Fragments](/drupal/graphql) for full details.

At minimum, you need:

1. A `paragraph` union fragment that spreads all your paragraph bundle fragments
2. A `pbMutatedEntity` fragment that defines which host entity fields to fetch
3. Individual paragraph bundle fragments (e.g. `paragraphText`)

## Step 7: Set Up a Page Component

Create a page component that wraps your content with `<BlokkliProvider>`:

```vue
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="props">
    <h1>{{ entity.title }}</h1>
    <BlokkliField :list="paragraphs" name="field_paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { NodePageFragment } from '#graphql-operations'

const props = defineProps<{
  title: string
  paragraphs: NodePageFragment['paragraphs']
  blokkliProps: NodePageFragment['blokkliProps']
}>()
</script>
```

See [Page Components](/drupal/pages) for the full setup.

## Step 8: Create Block Components

Create Vue components for each paragraph type:

```vue
<template>
  <div v-blokkli-editable:field_text v-html="text" />
</template>

<script lang="ts" setup>
defineProps<{ text: string }>()

defineBlokkli({
  bundle: 'text',
})
</script>
```

See [Block Components](/drupal/blocks) for more examples.

## What You Get

With this setup, the Drupal adapter automatically provides:

- Adding, moving, deleting, and duplicating paragraphs
- Undo/redo history
- Block options editing
- Inline text editing
- Preview before publishing
- Media library integration (if configured)
- Content search (if configured)
- Reusable library (if configured)
- Comments and review workflow (if configured)

The adapter detects which Drupal submodules are enabled by introspecting the
GraphQL schema at build time. Features are automatically enabled or disabled
based on what's available.
