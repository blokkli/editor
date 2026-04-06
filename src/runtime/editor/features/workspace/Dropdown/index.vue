<template>
  <ScrollBoundary
    class="absolute top-full right-0 bg-white text-mono-900 w-[400px] shadow-lg border border-mono-300 border-t-0"
  >
    <div
      class="bg-mono-200 text-mono-800 px-15 text-sm font-semibold h-40 flex items-center border-b border-b-mono-300"
    >
      Switch current page
    </div>
    <ConfigFormInline
      v-if="filters.length"
      v-model="filterValues"
      :filters="filters"
    />
    <div
      v-if="status === 'pending'"
      class="p-20 flex items-center justify-center"
    >
      <Loading />
    </div>
    <div v-else-if="items.length">
      <div class="h-[calc(100vh-400px)] max-h-[900px] overflow-auto">
        <a
          v-for="item in items"
          :key="item.hostEntityUuid"
          :href="item.url"
          class="flex items-center gap-10 px-15 py-10 w-full text-left text-sm hover:bg-mono-100 no-underline text-mono-900 bg-white max-w-full min-w-0"
        >
          <StatusIndicator :status="item.entity.status ? 'success' : 'error'" />
          <div class="flex-1 min-w-0">
            <div class="truncate font-semibold">
              {{ item.entity.label || item.hostEntityUuid }}
            </div>
            <div v-if="item.entity.bundleLabel" class="text-xs text-mono-600">
              <span>{{ item.entity.bundleLabel }} - </span>
              <RelativeTime
                v-if="item.lastChanged"
                :timestamp="item.lastChanged"
              />
            </div>
          </div>
          <div class="flex items-center gap-5 shrink-0 text-xs text-mono-400">
            <Icon
              v-if="item.currentUserIsOwner"
              name="bk_mdi_person"
              class="size-15"
            />
          </div>
        </a>
      </div>
      <Pagination v-model="page" :total-pages />
    </div>
    <div v-else class="p-20 text-mono-400 text-sm text-center">
      {{ $t('workspaceNoEditStates', 'No edit states found.') }}
    </div>
  </ScrollBoundary>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, useLazyAsyncData, watch } from '#imports'
import {
  ConfigFormInline,
  Icon,
  Loading,
  StatusIndicator,
  Pagination,
  ScrollBoundary,
  RelativeTime,
} from '#blokkli/editor/components'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'

const { adapter, $t, context } = useBlokkli()

const filterValues = ref<Record<string, any>>({})
const defaultsApplied = ref(false)
const page = ref(0)

const filterKey = computed(() => Object.values(filterValues.value).join(','))

watch(filterKey, () => {
  page.value = 0
})

const { data, status } = await useLazyAsyncData(
  () => {
    return adapter.getEditStates!({
      page: page.value,
      filters: filterValues.value,
    })
  },
  { watch: [filterKey, page] },
)

const items = computed(
  () =>
    data.value?.items.filter(
      (v) => v.hostEntityUuid !== context.value.entityUuid,
    ) || [],
)

const filters = computed<PluginConfigInput[]>(() => data.value?.filters ?? [])

const total = computed(() => data.value?.total || 0)
const perPage = computed(() => data.value?.perPage || 0)

const totalPages = computed(() => {
  return Math.ceil(total.value / perPage.value)
})

// Apply default values from filters on first load.
watch(filters, (newFilters) => {
  if (defaultsApplied.value || !newFilters.length) {
    return
  }
  defaultsApplied.value = true
  for (const filter of newFilters) {
    if (
      'defaultValue' in filter &&
      filter.defaultValue !== undefined &&
      filterValues.value[filter.name] === undefined
    ) {
      filterValues.value[filter.name] = filter.defaultValue
    }
  }
})
</script>
