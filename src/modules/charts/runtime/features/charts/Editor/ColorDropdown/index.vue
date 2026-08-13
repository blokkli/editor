<template>
  <ColorDropdown
    :model-value="colorId"
    @update:model-value="$emit('select', $event)"
  />
</template>

<script setup lang="ts">
import { ColorDropdown } from '#blokkli/editor/components'

defineProps<{
  colorId: string
}>()

defineEmits<{
  select: [colorId: string]
}>()
</script>
