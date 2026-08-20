<template>
  <div class="h-300 bg-accent-200">{{ data }}</div>
</template>

<script setup lang="ts">
const { data } = await useAsyncData(() => {
  return new Promise((resolve) => {
    resolve(100)
  })
})
</script>
