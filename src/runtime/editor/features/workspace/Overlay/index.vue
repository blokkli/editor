<template>
  <SearchOverlay
    v-slot="{ focusedIndex, onMouseEnter }"
    v-model:text="searchText"
    :title="$t('switchPage', 'Switch page')"
    :total-items="displayItems.length"
    :is-searching
    :placeholder="
      $t('workspaceSearchPlaceholder', 'Search pages', { more: true })
    "
    :item-height="70"
    :is-loading="workspaces.isLoading.value"
    @select="onSelectByIndex"
    @close="emit('close')"
  >
    <Item
      v-for="(item, i) in displayItems"
      :key="item.uuid"
      v-bind="item"
      :focused="focusedIndex === i"
      :bundle-label="workspaces.getBundleLabel(item.bundle)"
      :is-owner="!!(item.uid && item.uid === ownerId)"
      @mouseenter="onMouseEnter(i)"
    />
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
import { SearchOverlay } from '#blokkli/editor/components'
import Item from './Item.vue'
import type { HostEntitySearchResultItem } from '#blokkli/editor/providers/workspaces'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { $t, state, workspaces } = useBlokkli()

const searchText = ref('')
const fzfResults = ref<HostEntitySearchResultItem[]>([])
const isSearching = ref(false)

const ownerId = computed(() => state.owner.value?.id)

const displayItems = computed<HostEntitySearchResultItem[]>(() => {
  const source = searchText.value.trim()
    ? fzfResults.value
    : workspaces.defaultSorted.value
  return source.slice(0, 50)
})

function onSelectByIndex(index: number) {
  const item = displayItems.value[index]
  if (item) {
    window.location.href = item.url
  }
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
      const results = await workspaces.search(query)
      // Guard against stale results.
      if (searchText.value.trim() === query) {
        fzfResults.value = results
      }
    } finally {
      if (searchText.value.trim() === query) {
        isSearching.value = false
      }
    }
  }, 150)
})

onMounted(() => workspaces.ensureLoaded())

onBeforeUnmount(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>
