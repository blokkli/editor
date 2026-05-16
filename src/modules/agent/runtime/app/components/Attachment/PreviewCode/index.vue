<template>
  <pre
    class="text-sm overflow-auto bg-mono-100 rounded p-15"
  ><code class="font-mono">{{ content }}</code></pre>
</template>

<script lang="ts" setup>
defineProps<{
  content: string
}>()
</script>
