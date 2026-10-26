# getDroppableFieldConfig()

This method should return the configuration of droppable fields.

It's expected to return an array of `DroppableFieldConfig` objects.

For example, if we want to make a single field droppable on a block component
like this:

```vue [Image.vue]
<template>
  <div v-blokkli-droppable:field_image>
    <img :src="imgSrc" />
  </div>
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'image',
})

defineProps<{
  imgSrc: string
}>()
</script>
```

Then this adapter method would need to return a single object that describes
this field:

```typescript
function getDroppableFieldConfig() {
  const mapEntityFields = (
    entity: typeof Content | typeof Block,
  ): DroppableFieldConfig[] => {
    return [
      {
        // Either 'reference' (an entity reference field) or 'link'.
        type: 'reference',
        name: 'field_image',
        label: 'Image',
        entityType: 'block',
        entityBundle: 'image',
        // The entity types and bundles that may be dropped on this field.
        allowed: [{ type: 'media', bundles: ['image'] }],
        cardinality: 1,
        required: true,
        // Whether the value can differ per language. Optional.
        isTranslatable: false,
      },
    ]
  }
}
```

## Translatable fields

When a media or a search result is dropped onto a field with
`isTranslatable: true`, and the block (or, for a field of the page entity, the
page) has another translation, the editor asks whether to change the field in
all languages or only in the current one. The answer is passed to the adapter as
`allLanguages` ([mediaLibraryReplaceMedia](./mediaLibraryReplaceMedia.md),
[mediaLibraryReplaceEntityMedia](./mediaLibraryReplaceEntityMedia.md) and
`replaceContentSearchItem`). Without `isTranslatable`, the editor never asks.
