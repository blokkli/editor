<template>
  <div
    :class="{ 'container my-40': !parentType }"
    :data-widget="options.widget"
  ></div>
</template>

<script lang="ts" setup>
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
  editTitle: (el) => el.dataset.widget,
})
</script>