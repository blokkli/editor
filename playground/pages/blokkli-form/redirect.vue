<template>
  <div>...</div>
</template>

<script lang="ts" setup>
definePageMeta({
  name: 'blokkli-form-redirect',
})

onMounted(() => {
  if (window.parent === window) {
    return
  }

  window.parent.postMessage({ event: 'BLOKKLI', action: 'SAVE' })
})
</script>
