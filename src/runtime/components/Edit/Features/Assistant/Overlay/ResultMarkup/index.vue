<template>
  <div class="bk-assistant-result-markup">
    <div class="ck-content" v-html="markup" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  markup: string
}>()
</script>
<script lang="ts">
export default {
  name: 'AssistantResultMarkup',
}
</script>
