# buildEditableFrameUrl()

This method should build the URL for an iframe that renders the rich text editor
for the given block field.

The method is called when the user double clicks on an editable field of type
`frame`. It is also used by the diff approval workflow when the user manually
edits a suggested value for a `frame` field.

## Translations

In translating mode the URL is requested for the current (target) language — for
example via a language prefix. The backend route must render the editor form
even when the target translation does not yet exist on the backend; falling back
to the source-language value is fine. When the editor opens the frame as part of
a diff approval edit, it seeds the editor with the value being reviewed and
persists the result itself (for translations via `importTranslationsBatched`
with an explicit langcode), so the initially rendered value is never used.

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
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

type AdapterBuildEditableFrameUrl = {
  fieldName: string
  uuid?: string
}

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
