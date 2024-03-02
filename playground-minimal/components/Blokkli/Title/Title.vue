<template>
  <div>
    <Component :is="options.level || 'h2'">
      <span v-blokkli-editable:title v-text="title" />
    </Component>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

const { options } = defineBlokkli({
  bundle: 'title',
  options: {
    level: {
      type: 'radios',
      label: 'Heading Level',
      default: 'h2',
      options: {
        h1: 'H1',
        h2: 'H2',
        h3: 'H3',
        h4: 'H4',
      },
    },
  },
})

defineProps<{
  title: string
}>()
</script>
