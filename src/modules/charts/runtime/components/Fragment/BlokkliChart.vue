<template>
  <div>Hello World</div>
</template>

<script setup lang="ts">
import { defineBlokkliFragment } from '#imports'

defineBlokkliFragment({
  name: 'blokkli_chart',
  label: 'Chart',
  description: 'Create interactive charts.',
  editor: {
    previewWidth: 1200,
  },
  options: {
    data: {
      type: 'json',
      label: 'The chart data.',
      default: '{}',
    },
  },
})
</script>
