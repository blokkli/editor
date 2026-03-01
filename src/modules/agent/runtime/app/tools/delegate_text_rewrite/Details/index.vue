<template>
  <div class="bk-batch-rewrite-details">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="bk-batch-rewrite-details-item"
    >
      <div class="bk-batch-rewrite-details-label">{{ item.fieldLabel }}</div>
      <template v-if="item.operations?.length">
        <DiffDisplay
          v-for="(op, opIndex) in item.operations"
          :key="opIndex"
          :before="op.search"
          :after="op.replace"
          mode="inline"
        />
      </template>
      <DiffDisplay
        v-else
        :before="item.before"
        :after="item.after"
        mode="inline"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { DiffDisplay } from '#blokkli/editor/components'
import type { StreamTextFieldsDetailItem } from '../Component.vue'

const props = defineProps<{
  details: unknown
}>()

const items = computed<StreamTextFieldsDetailItem[]>(() => {
  if (!Array.isArray(props.details)) return []
  return props.details
})
</script>
