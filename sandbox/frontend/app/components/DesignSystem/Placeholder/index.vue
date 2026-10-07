<template>
  <div
    class="flex items-center justify-center border border-line bg-surface p-4 text-center text-small text-muted"
    style="
      background-image: repeating-linear-gradient(
        135deg,
        var(--color-line) 0 1px,
        transparent 1px 12px
      );
    "
  >
    <span class="bg-surface px-2">{{ label }}</span>
  </div>
</template>

<script lang="ts" setup>
// An image in a mockup. The size comes from the class, e.g. aspect-3/2.
defineProps<{
  label: string
}>()
</script>
