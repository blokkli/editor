<template>
  <div :class="{ 'opacity-50': stale }">
    <BlokkliItem
      v-if="item"
      v-bind="item"
      :options="mergedOptions"
      :is-editing="false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, useBlokkli } from '#imports'
import type { BlokkliChartData } from '../../../../types'
import type {
  FieldListItemTyped,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
  INJECT_PROVIDER_BLOCKS,
} from '#blokkli/helpers/injections'

const { state } = useBlokkli()

const props = defineProps<{
  uuid: string
  optionKey: string
  data: BlokkliChartData | null
  stale: boolean
}>()

const item = computed(() => state.getFieldListItem(props.uuid))

const mergedOptions = computed(() => {
  const base = item.value?.options || {}
  return {
    ...base,
    [props.optionKey]: JSON.stringify(props.data),
  }
})

const blocks = computed(() => [] as FieldListItemTyped[])
const fieldListType = computed(() => 'default' as ValidFieldListTypes)

provide(INJECT_IS_IN_REUSABLE, true)
provide(INJECT_IS_EDITING, true)
provide(INJECT_FIELD_LIST_BLOCKS, blocks)
provide(INJECT_PROVIDER_BLOCKS, blocks)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
provide(INJECT_EDIT_CONTEXT, null)
</script>
