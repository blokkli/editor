<template>
  <!-- eslint-disable-next-line vue/no-v-html -- X2 in plans/xss: a dropped file, unfiltered -->
  <div class="whitespace-normal bk-agent-message-text" v-html="content" />
</template>

<script lang="ts" setup>
defineProps<{
  content: string
}>()
</script>
