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
        name: 'field_image',
        label: 'Image',
        entityType: 'block',
        entityBundle: 'image',
        allowedEntityType: 'media',
        allowedBundles: ['image'],
        cardinality: 1,
        required: true,
      },
    ]
  }
}
```
