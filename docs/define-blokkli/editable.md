# Editable and Droppable Fields

You can make text fields directly editable within blökkli. Currently there are
two ways to do that: Editable fields and droppable areas.

## Editable Fields

Using the `v-blokkli-editable` directive you can annotate a DOM element that
contains a specific field value:

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

The name of the field is passed as the only argument to the directive (in the
above example: `field_title`). For this feature to work, both the
[updateFieldValue](/adapter/updateFieldValue) and
[getEditableFieldConfig](/adapter/getEditableFieldConfig) adapter methods must
be implemented.

blökkli will check the returned field configs from the `getEditableFieldConfig`
method to find a config that matches the current context. This tells blökkli
wether the field is required or if it defines a max length.

## Droppable Fields

Using the `v-blokkli-droppable` directive you can annotate a DOM element to be a
**drag and drop target** for things like images from the media library or
content items from the search.

It works similar to editable fields, you define the name of the field as the
argument to the directive. blökkli will try to find a matching config returned
by the [getDroppableFieldConfig](/adapter/getDroppableFieldConfig) adapter
method to decide whether the item being dragged can be dropped on that area.

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
