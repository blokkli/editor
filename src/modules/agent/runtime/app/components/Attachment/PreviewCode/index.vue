<template>
  <pre class="bk-agent-attachment-code"><code>{{ content }}</code></pre>
</template>

<script lang="ts" setup>
defineProps<{
  content: string
}>()
</script>
