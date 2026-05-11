<template>
  <div
    class="sticky bottom-0 z-50 p-10 bg-linear-0 bk-sidebar-floater mt-30"
    :class="{
      'bg-mono-100 before:from-mono-100 before:to-mono-100/0 ': mono,
      'bg-white before:from-white before:to-white/0 ': !mono,
    }"
  >
    <div
      class="border border-mono-300 shadow-md-even overflow-hidden rounded focus-within:border-mono-500 relative z-50 bg-white"
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

<style lang="postcss">
.bk-sidebar-floater {
  &:before {
    content: '';
    @apply absolute bottom-full left-0 w-full h-20 bg-linear-0 z-40;
  }
}
</style>
