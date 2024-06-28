<template>
  <a href="/foobar" class="button" @click="onClick">Test a NuxtLink</a>
</template>

<script setup lang="ts">
import { defineBlokkliFragment } from '#imports'

defineBlokkliFragment({
  name: 'top_level_link',
  label: 'Top Level Link',
  description: 'Renders a top level <NuxtLink>.',
  editor: {
    previewWidth: 1200,
  },
})

function onClick() {
  console.log('CLICK')
}
</script>
