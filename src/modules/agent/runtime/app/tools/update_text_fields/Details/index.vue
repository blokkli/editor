<template>
  <div class="bk-batch-rewrite-details">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="bk-batch-rewrite-details-item"
    >
      <div class="bk-batch-rewrite-details-label">{{ item.fieldLabel }}</div>
      <DiffDisplay :before="item.before" :after="item.after" mode="inline" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { DiffDisplay } from '#blokkli/editor/components'
import type { BatchRewriteDetailItem } from '../Component.vue'

const props = defineProps<{
  details: unknown
}>()

const items = computed<BatchRewriteDetailItem[]>(() => {
  if (!Array.isArray(props.details)) return []
  return props.details
})
</script>
