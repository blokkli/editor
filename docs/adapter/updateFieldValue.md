# updateFieldValue()

This method should update the value of an editable field of a block.

## Example

Assuming we have a block that looks like this:

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

The user is able to directly edit the text of this element in the editor without
opening the form.

The method is called when the user finished editing the field.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { UpdateFieldValueEvent } from '#blokkli/types'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    updateFieldValue: (e: UpdateFieldValueEvent) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/update-field-value`,
        {
          method: 'post',
          body: {
            // The UUID of the block.
            uuid: e.uuid,

            // The name of the field that was edited. In our example that would be "field_title".
            fieldName: e.fieldName,

            // The updated field value.
            value: e.fieldValue,
          },
        },
      )
    },
  }
})
```

:::
