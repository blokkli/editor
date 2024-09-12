# blökkli Docs

blökkli is an interactive page builder for Nuxt.

## Install package

```sh
npm install --save @blokkli/editor
```

## Configure module

Add the module in your Nuxt config, together with the minimum blokkli config:

```typescript
export default defineNuxtConfig({
  modules: ['@blokkli/editor'],

  blokkli: {
    // Only required configuration.
    // Should match the entity type of your blocks.
    itemEntityType: 'block',
  },
})
```

## Create adapter

For the editor to work, an adapter is needed. Create a new file with the
following contents:

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {}
})
```

:::

[Learn more about blökkli adapters](/adapter/overview)

## Define the provider and a field

At least one `<BlokkliProvider>` component is required. It sets the context for
rendering both the blocks and the editor.

A field is a place/region where blocks will be rendered. A page can have
multiple fields, but at least one is required:

::: code-group

```vue [~/pages/example.vue]
<template>
  <BlokkliProvider
    entity-type="content"
    entity-bundle="blog_post"
    entity-uuid="1"
  >
    <BlokkliField :list="blocks" name="blocks" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
const blocks = [
  {
    uuid: '96f7fbda-04d9-4662-9a6c-6aa3bcf964f2',
    bundle: 'title',
    props: {
      title: 'Hello world',
    },
  },
]
</script>
```

:::

## Define a block component

In the last step, create a Vue component that should be rendered when the
`bundle` property of a block is `title`.

[Learn more about defineBlokkli()](/define-blokkli)

::: code-group

```vue [~/components/Blocks/Title.vue]
<template>
  <h2>{{ title }}</h2>
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'title',
})

defineProps<{
  title: string
}>()
</script>
```

When you open the page in the browser now, you should see the block component
being rendered, with the correct props.
