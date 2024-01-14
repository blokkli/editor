<template>
  <div
    :class="{ 'container my-40': !parentType }"
    :data-widget="options.widget"
  ></div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

const { options, parentType } = defineBlokkli({
  bundle: 'widget',
  options: {
    widget: {
      type: 'radios',
      label: 'Widget',
      default: '',
      options: {
        searchbox: 'Searchbox',
      },
    },
  },
  editor: {
    editTitle: (el) => el.dataset.widget,
  },
})
</script>
