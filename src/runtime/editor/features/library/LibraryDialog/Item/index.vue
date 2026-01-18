<template>
  <div
    data-element-type="reusable"
    :data-item-bundle="bundle"
    :data-library-item-uuid="uuid"
    :data-label="label"
    class="bk-block-preview-item"
  >
    <BlockPreviewItem :items="item" :title="label || ''" :bundle="bundle" />
  </div>
</template>

<script setup lang="ts">
import type { FieldListItem } from '#blokkli/types'
import { BlockPreviewItem } from '#blokkli/editor/components'

defineProps<{
  uuid: string
  label?: string
  bundle: string
  item: FieldListItem
}>()
</script>
