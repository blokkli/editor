# Phase 2: Nuxt module (@blokkli/editor)

Requires phase 1 to be done: the frontend relies on the updated GraphQL schema.
It also requires Nuxt 4.4 or later (see "Nuxt 4.4 first" in `SKILL.md`).

## nuxt.config.ts

- New concept of blökkli "modules"
- the one you need is the `drupal` module

```typescript
import drupal from '@blokkli/editor/drupal'

export default defineNuxtConfig({
  blokkli: {
    modules: [drupal()],
  },
})
```

This automatically sets up everything that previously required manual work. You
can remove the following option keys if present:

- getBundlePropsType
- itemEntityType

Also check the `autoImportPatterns` key of `graphqlMiddleware`: It is no longer
needed to register the blökkli GraphQL files such as
`'node_modules/@blokkli/editor/dist/runtime/adapter/drupal/graphql/base.graphql',`.
The blökkli `drupal` module automatically registers them based on the available
types in the GraphQL schema.

This also means that if you previously manually altered blökkli features like
this:

```
alterFeatures: (ctx) => {
  return ctx.features.filter((v) => v.id !== 'comments')
}
```

This can likely also be removed now - the `comments` feature (or any other
feature) is now only enabled if the needed fields and types are present in the
GraphQL schema.

For this to work, you **must** register `nuxt-graphql-middleware` **before**
`@blokkli/editor` in the `modules` of `nuxt.config.ts`.

## GraphQL fragments

The following fragments are now already provided by blökkli:

- `fragment blokkliProps on ParagraphsBlokkliProps`
- `fragment paragraphsFieldItem on Paragraph`

You can safely delete them from the project.

Make sure the paragraphFromLibrary fragment has the following structure:

```graphql
fragment paragraphFromLibrary on ParagraphFromLibrary {
  uuid
  libraryItem: fieldReusableParagraph {
    uuid
    label
    block: paragraphs {
      ...paragraphsFieldItem
      props {
        # Add all the paragraph fragments here that are reusable
        ...paragraphText
      }
    }
  }
}
```

## blokkli.editAdapter.ts

The minimal adapter you need is this:

```typescript
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
import drupalAdapter from '#blokkli/drupal/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return drupalAdapter(ctx)
})
```

This makes everything work out of the box. If the existing adapter contains more
code, especially stuff that looks custom => let the developer know before
proceeding!

## BlokkliProvider

- Check each component that uses `<BlokkliProvider>`
- It is no longer needed to manually provide `:entity-type`, `:entity-uuid`,
  etc. props
- blökkli automatically provides the `blokkliProps` fragment

So whenever a `<BlokkliProvider>` is used, you can now fetch the props from
GraphQL:

```graphql
fragment nodePage on NodePage {
  __typename
  title
  lead: fieldLead
  blokkliProps {
    ...blokkliProps
  }
}
```

Then in the `Node/Page/index.vue` (or whatever it is) component:

```vue
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="$props">
    <h1 v-blokkli-editable:title v-html="entity.title" />
    <p v-blokkli-editable:field_lead v-html="entity.lead" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { NodePageFragment } from '#graphql-operations'

defineProps<NodePageFragment>()
</script>
```

Make sure the project has a `pbMutatedEntity` fragment. blökkli references it as
part of the main edit state fragment. It might look like something like this:

```graphql
fragment pbMutatedEntity on Entity {
  ... on Node {
    title
  }

  ... on NodePage {
    hero: fieldHeroImage {
      ...mediaImage
    }
    lead: fieldLead
  }
}
```

**IMPORTANT:** Do NOT include the full `nodePage` fragment here!!! ONLY fetch
fields that are actually EDITABLE in the editor, such as hero images, titles,
lead texts, etc. Fetching anything here WITHOUT a matching `v-blokkli-editable`,
`v-blokkli-droppable` or `<BlokkliEditable>` as a child of `<BlokkliProvider>`
is pointless.

Internally, the `:entity` prop's object is _merged_ with whatever the
`pbMutatedEntity` fragment returns in the edit state. This means the
`v-slot="{ entity }` object is the _merged_ object during editing. When not
editing, this just returns `$props`.

## Done when

- The dev server starts without errors
- The project's typecheck passes
- The editor opens on a page and paragraphs can be edited
