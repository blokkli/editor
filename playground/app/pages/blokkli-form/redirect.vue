<template>
  <div>...</div>
</template>

<script lang="ts" setup>
import { definePageMeta, onMounted } from '#imports'

definePageMeta({
  name: 'blokkli-form-redirect',
  layout: 'form',
})

onMounted(() => {
  if (window.parent === window) {
    return
  }

  window.parent.postMessage({ event: 'BLOKKLI', action: 'SAVE' })
})
</script>
