<template>
  <a class="button self-start" :href="url || '#'">{{ label }}</a>
</template>

<script lang="ts" setup>
defineProps<{ label: string; url?: string }>()
</script>
