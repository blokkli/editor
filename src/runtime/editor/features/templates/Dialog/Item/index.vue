<template>
  <BlockPreviewItem
    :items="items"
    :title="label"
    :description="description"
    :max-height="200"
    :no-preview="!items.length"
  />
</template>

<script setup lang="ts">
import { BlockPreviewItem } from '#blokkli/editor/components'
import type { FieldListItem } from '#blokkli/types'

defineProps<{
  uuid: string
  label: string
  description?: string
  items: FieldListItem[]
  isDefault: boolean
}>()
</script>
