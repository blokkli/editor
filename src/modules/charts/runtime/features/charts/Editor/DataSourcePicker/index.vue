<template>
  <div class="p-panel-gap flex flex-col gap-10">
    <FormSearch
      :id="searchId"
      v-model:query="query"
      :label="$t('chartsDynamicPickSource', 'Pick a data source')"
      :placeholder="$t('chartsDynamicSearchPlaceholder', 'Search…')"
      :items
      :loading="status === 'pending'"
      :mode="formMode"
      :selected-label="selected?.label"
      disable-grouping
      @select="onSelect"
      @clear="$emit('clear')"
    />
    <div v-if="error" class="text-sm text-red-normal">
      {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useAsyncData, useBlokkli, watch } from '#imports'
import { FormSearch } from '#blokkli/editor/components'
import type { FormSearchItem } from '#blokkli/editor/components'
import type {
  ChartDataSource,
  ChartDataSourceCapabilities,
} from '../../../../types'

const props = defineProps<{
  capabilities: ChartDataSourceCapabilities
  selected: ChartDataSource | null
}>()

const emit = defineEmits<{
  select: [ChartDataSource]
  clear: []
  /**
   * Emitted when the live list of sources is loaded. Parent uses this to
   * decide whether the currently-selected source is "missing" from the
   * live list (deleted source ID).
   */
  'update:knownIds': [Set<string>]
}>()

const { $t, adapter } = useBlokkli()

const searchId = 'bk-chart-data-source-picker'

const query = ref('')
const debouncedQuery = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (next) => {
  if (!props.capabilities.supportsSearch) {
    debouncedQuery.value = next
    return
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = next.trim()
  }, 300)
})

const formMode = computed<'fzf' | 'async'>(() =>
  props.capabilities.supportsSearch ? 'async' : 'fzf',
)

const { data: sources, status, error } = await useAsyncData<ChartDataSource[]>(
  async () => {
    if (!adapter.getChartDataSources) return []
    const args = props.capabilities.supportsSearch
      ? { text: debouncedQuery.value, page: 0 }
      : {}
    const result = await adapter.getChartDataSources(args)
    return Array.isArray(result) ? result : result.items
  },
  {
    watch: [debouncedQuery],
    default: () => [],
  },
)

watch(
  sources,
  (list) => emit('update:knownIds', new Set(list.map((s) => s.id))),
  { immediate: true },
)

const items = computed<FormSearchItem[]>(() =>
  sources.value.map((s) => ({
    key: s.id,
    label: s.label,
    description: s.description,
  })),
)

function onSelect(item: FormSearchItem) {
  const source = sources.value.find((s) => s.id === item.key)
  if (source) emit('select', source)
}
</script>
