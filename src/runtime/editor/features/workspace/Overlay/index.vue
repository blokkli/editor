<template>
  <SearchOverlay
    v-model:text="searchText"
    :title="$t('workspaceTitle', 'Switch page')"
    :total-items="displayItems.length"
    :is-searching
    :placeholder="$t('workspaceSearchPlaceholder', 'Search pages...')"
    :item-height="70"
    :is-loading
    @select="onSelectByIndex"
    @close="emit('close')"
    v-slot="{ focusedIndex, onMouseEnter }"
  >
    <a
      v-for="(item, i) in displayItems"
      :key="item.uuid"
      ref="itemEls"
      :href="item.url"
      class="bk-command flex items-center gap-10 px-15 w-full text-left no-underline max-w-full min-w-0 border border-transparent"
      :class="
        focusedIndex === i
          ? 'bg-mono-800 border-mono-100 text-white'
          : 'text-mono-300'
      "
      @mouseenter="onMouseEnter(i)"
    >
      <div class="flex-1 min-w-0">
        <div class="truncate font-semibold text-base">
          {{ item.label }}
          <span class="font-normal text-mono-500">{{ item.id }}</span>
        </div>
        <ul class="flex gap-5 mt-3">
          <li class="bk-workspace-pill px-0 text-mono-300">
            {{ getBundleLabel(item) }}
          </li>
          <li
            v-if="item.lastChanged"
            class="bk-workspace-pill bg-yellow-dark/60 text-yellow-light"
          >
            <RelativeTime :timestamp="item.lastChanged" />
          </li>
          <li
            v-if="item.uid && item.uid === ownerId"
            class="bk-workspace-pill bg-accent-700/80"
          >
            <span>{{ $t('owner', 'Owner') }}</span>
          </li>
        </ul>
      </div>
    </a>
  </SearchOverlay>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  watch,
} from '#imports'
import { SearchOverlay, RelativeTime } from '#blokkli/editor/components'
import { AsyncFzf, asyncExtendedMatch } from 'fzf'
import type {
  HostEntitySearchResultItem,
  HostEntitySearchResult,
} from '../types'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { adapter, $t, context, state, cache } = useBlokkli()

const searchText = ref('')
const isLoading = ref(true)
const allItems = ref<HostEntitySearchResultItem[]>([])
const labelMap = ref<HostEntitySearchResult['labelMap'] | null>(null)
const fzfResults = ref<HostEntitySearchResultItem[]>([])
const isSearching = ref(false)

const ownerId = computed(() => state.owner.value?.id)

const currentEntityUuid = computed(() => context.value.entityUuid)

const defaultSorted = computed(() => {
  return allItems.value
    .filter((v) => v.uuid !== currentEntityUuid.value)
    .sort((a, b) => {
      // Primary: entities with edit states first
      const aHasState = a.lastChanged !== null ? 0 : 1
      const bHasState = b.lastChanged !== null ? 0 : 1
      if (aHasState !== bHasState) return aHasState - bHasState

      // Secondary: current user is owner first
      const aIsOwner = a.uid && a.uid === ownerId.value ? 0 : 1
      const bIsOwner = b.uid && b.uid === ownerId.value ? 0 : 1
      if (aIsOwner !== bIsOwner) return aIsOwner - bIsOwner

      // Tertiary: by lastChanged (most recent first)
      if (a.lastChanged && b.lastChanged) {
        return (
          new Date(b.lastChanged).getTime() - new Date(a.lastChanged).getTime()
        )
      }
      if (a.lastChanged) return -1
      if (b.lastChanged) return 1

      // Quaternary: alphabetically by label
      return a.label.localeCompare(b.label)
    })
})

const allSortedItems = computed(() => {
  if (searchText.value.trim()) {
    return fzfResults.value.filter((v) => v.uuid !== currentEntityUuid.value)
  }
  return defaultSorted.value
})

const displayItems = computed(() => allSortedItems.value.slice(0, 50))

function getBundleLabel(item: HostEntitySearchResultItem): string {
  return labelMap.value?.bundles[item.bundle] ?? item.bundle
}

function onSelectByIndex(index: number) {
  const item = displayItems.value[index]
  if (item) {
    window.location.href = item.url
  }
}

function getFzf(): AsyncFzf<HostEntitySearchResultItem[]> {
  return cache.get(
    'workspace:fzf',
    () =>
      new AsyncFzf(allItems.value, {
        selector: (item: HostEntitySearchResultItem) =>
          item.context ? item.label + ' ' + item.context : item.label,
        match: asyncExtendedMatch,
      }),
  )
}

// Debounced search.
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchText, (newValue) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }

  if (!newValue.trim()) {
    fzfResults.value = []
    isSearching.value = false
    return
  }

  isSearching.value = true
  const query = newValue.trim()

  searchTimeout = setTimeout(async () => {
    if (searchText.value.trim() !== query) {
      isSearching.value = false
      return
    }
    try {
      const results = await getFzf().find(query)
      // Guard against stale results.
      if (searchText.value.trim() === query) {
        fzfResults.value = results.map((r) => r.item)
      }
    } finally {
      if (searchText.value.trim() === query) {
        isSearching.value = false
      }
    }
  }, 150)
})

onMounted(async () => {
  try {
    const result = await cache.getAsync('workspace:hostEntities', () =>
      adapter.getHostEntities!(),
    )
    allItems.value = result.items
    labelMap.value = result.labelMap
  } finally {
    isLoading.value = false
  }
})

onBeforeUnmount(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<style lang="postcss">
.bk .bk-workspace-pill {
  @apply flex items-center gap-3 text-xs px-5 py-1 rounded-full font-medium;
}
</style>
