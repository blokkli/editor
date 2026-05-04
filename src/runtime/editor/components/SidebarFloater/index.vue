<template>
  <div
    class="sticky bottom-0 z-50 mt-15 p-15 bg-linear-0"
    :class="{
      'from-mono-100 to-mono-100/0': mono,
      'from-white to-white/0': !mono,
    }"
  >
    <div
      class="border border-mono-300 shadow-md-even overflow-hidden rounded focus-within:border-mono-500 bg-white"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  mono?: boolean
}>()
</script>
