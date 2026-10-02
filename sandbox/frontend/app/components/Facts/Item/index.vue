<template>
  <div class="flex flex-col gap-2 border-t-3 border-primary pt-4">
    <dt class="font-sans text-label text-muted uppercase">{{ label }}</dt>
    <dd><slot /></dd>
  </div>
</template>

<script lang="ts" setup>
// A class on the item styles its value, e.g. an event's large facts. The label
// keeps its own style.
defineProps<{
  label: string
}>()
</script>
