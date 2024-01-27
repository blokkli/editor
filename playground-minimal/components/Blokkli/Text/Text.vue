<template>
  <div>
    <p v-blokkli-editable:text>
      {{ text }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
defineBlokkli({
  bundle: 'text',
})

defineProps<{
  text: string
}>()
</script>
