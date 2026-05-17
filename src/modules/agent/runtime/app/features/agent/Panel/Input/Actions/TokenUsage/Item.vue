<template>
  <li :title="tooltip" class="h-30 flex-1 cursor-help px-10">
    <div
      class="text-[10px] font-medium uppercase tracking-wide mb-3 text-mono-500 flex items-center"
    >
      {{ title }}
    </div>
    <div class="font-mono text-xs">
      {{ value }}
    </div>
  </li>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  tooltip: string
  value: string
}>()
</script>
