<template>
  <div v-html="body" />
</template>

<script lang="ts" setup>
defineBlokkli({
  bundle: 'text',
})

defineProps<{
  body: string
}>()
</script>
