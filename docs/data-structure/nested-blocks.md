# Nested blocks

blökkli supports nested blocks, where a block itself can render additional
blocks.

This works as you would expect and is not much different than rendering a flat
list of blocks.

For this example we assume a block bundle called `grid` that can contain blocks
of bundle `card`.

## Root component (e.g. page)

Using our example from before, let's add the data structure for our nested
blocks:

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
  {
    uuid: '6eb4ba7f-5102-41eb-aa35-5c6a33daab82',
    bundle: 'grid',
    props: {
      cards: [
        {
          bundle: 'card',
          uuid: '5407ef47-dfbc-456b-9900-8e2577185380',
          props: {
            title: 'My Card Title',
            text: 'Lorem ipsum dolor sit amet',
          },
        },
        {
          bundle: 'card',
          uuid: '6eb4ba7f-5102-41eb-aa35-5c6a33daab82',
          props: {
            title: 'Another card title',
            text: 'Foobar',
          },
        },
      ],
    },
  },
]
</script>
```

:::

The nested blocks are just passed via a prop on the grid item.

## Grid component

Now let's look at our grid block component. We define a prop for the array of
block items and then pass this array to the `<BlokkliField>` component.

::: code-group

```vue [Grid.vue]
<template>
  <div class="grid grid-cols-3 gap-25">
    <BlokkliField name="cards" :list="cards" />
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItem } from '#blokkli/types'

defineBlokkli({
  bundle: 'grid',
})

defineProps<{
  cards: FieldListItem[]
}>()
</script>
```

:::

The field component will then render our nested card blocks correctly.
