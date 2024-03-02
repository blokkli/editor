# buildEditableFrameUrl()

This method should build the URL for an iframe that renders the rich text editor
for the given block field.

The method is called when the user double clicks on an editable field of type
`frame`.

## Example

This block component defines an editable field of type `frame`:

::: code-group

```vue [Text.vue]
<template>
  <div v-blokkli-editable:text v-html="text" />
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'text',
})

defineProps<{
  text: string
}>()
</script>
```

:::

Using the given argument the method build the URL that is displayed in the
iframe. The page that is rendered should only display the rich text editor.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import {
  defineBlokkliEditAdapter,
  type AdapterBuildEditableFrameUrl,
} from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    buildEditableFrameUrl: (e: AdapterBuildEditableFrameUrl) => {
      const prefix = `/backend-form/${ctx.value.entityType}/${ctx.value.entityUuid}/field-value-editor`
      const params = new URLSearchParams()
      params.set('fieldName', e.fieldName)
      if (e.uuid) {
        params.set('uuid', e.uuid)
      }
      return `${prefix}?${params.toString()}`
    },
  }
})
```

:::
