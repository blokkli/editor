# getEditableFieldConfig()

This method should return the configuration of editable fields.

It's expected to return an array of `EditableFieldConfig` objects.

## Example

Let's say we have a block where the title field should be editable:

::: code-group

```vue [Title.vue]
<template>
  <h2 v-blokkli-editable:field_title>{{ title }}</h2>
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

:::

We would then return the following editable field config in our
getEditableFieldConfig() method:

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getEditableFieldConfig: () => {
      return Promise.resolve([
        {
          // Same name as defined in v-blokkli-editable
          name: 'field_title',

          // Since the editable field is in the block, the entity type
          // is "block".
          entityType: 'block',

          // The bundle of the block.
          entityBundle: 'title',

          // The label displayed in the editor.
          label: 'Title',
        },
      ])
    },
  }
})
```

:::
