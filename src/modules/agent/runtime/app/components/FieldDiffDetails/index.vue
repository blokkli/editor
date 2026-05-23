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

/**
 * A before/after diff entry shown in the collapsible tool details panel.
 * `operations` is set by patch-mode rewrites to show per-operation diffs;
 * otherwise the full before/after pair is shown.
 */
export type FieldDiffDetailItem = {
  fieldLabel: string
  before: string
  after: string
  mode?: 'full' | 'patch'
  operations?: Array<{ search: string; replace: string }>
}

const props = defineProps<{
  details: unknown
}>()

const items = computed<FieldDiffDetailItem[]>(() => {
  if (!Array.isArray(props.details)) return []
  return props.details
})
</script>
