<template>
  <div class="bk-theme-editor-code">
    <textarea :value="code" rows="10"></textarea>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, computed } from '#imports'

const { theme } = useBlokkli()

const code = computed(() => {
  const obj = {
    accent: theme.accent.value,
    mono: theme.mono.value,
  }

  return JSON.stringify(obj, null, 2)
})
</script>
