<template>
  <tr>
    <th v-blokkli-editable:tagline>{{ tagline }}</th>
    <td v-blokkli-editable:title>{{ title }}</td>
    <td v-blokkli-editable:lead>{{ lead }}</td>
  </tr>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'title',
  renderFor: [
    {
      parentBundle: 'table',
    },
  ],
  editor: {
    addBehaviour: 'editable:title',
    editTitle: (el) => el.querySelector('th')?.textContent,
  },
})

defineProps<{
  title: string
  tagline?: string
  lead?: string
}>()
</script>
