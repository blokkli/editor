<template>
  <div class="bk bk-media-library">
    <div v-if="status === 'pending'" class="bk-loading">
      <Icon name="loader" />
    </div>
    <div class="bk-media-library-filters">
      <div class="bk-media-library-filters-listview">
        <button @click="toggleListView">
          <Icon :name="listViewIcon" />
        </button>
      </div>
      <div v-for="filter in filters" :key="filter.key">
        <label v-if="filter.filter.type === 'text'" class="bk-form-text">
          <Icon name="search" />
          <input
            v-model.lazy="filterValues[filter.key]"
            type="text"
            :placeholder="filter.filter.placeholder"
          />
        </label>
        <label
          v-else-if="filter.filter.type === 'select'"
          class="bk-form-select"
        >
          <div v-if="!filterValues[filter.key]">
            {{ Object.values(filter.filter.options)[0] }}
          </div>
          <select v-model="filterValues[filter.key]">
            <option
              v-for="option in Object.entries(filter.filter.options)"
              :key="option[0]"
              :value="option[0]"
            >
              {{ option[1] }}
            </option>
          </select>
        </label>
        <label
          v-else-if="filter.filter.type === 'checkbox'"
          class="bk-checkbox-toggle"
        >
          <input v-model="filterValues[filter.key]" type="checkbox" />
          <div />
          <span>{{ filter.filter.label }}</span>
        </label>
      </div>
    </div>
    <div
      ref="listEl"
      class="bk-media-library-items bk-scrollbar-light"
      :class="[{ 'bk-is-sortli': isSortli }, 'bk-is-' + listView]"
    >
      <Sortli v-if="isSortli" no-transition :get-drag-items="getDragItems">
        <Item
          v-for="item in items"
          :key="item.mediaId"
          v-bind="item"
          v-model="selected"
        />
      </Sortli>

      <div v-else>
        <Item v-for="item in items" :key="item.mediaId" v-bind="item" />
      </div>
    </div>

    <div v-if="selected.length" class="bk-media-library-cancel">
      <button class="bk-button bk-is-primary" @click.prevent="selected = []">
        {{ $t('cancelSelection', 'Cancel selection') }}
      </button>
    </div>

    <div class="bk-pagination">
      <button :disabled="page === 0" @click="page--">
        <Icon name="arrow-left" />
      </button>
      <div>{{ page + 1 }} / {{ totalPages }}</div>
      <button :disabled="page >= totalPages - 1" @click="page++">
        <Icon name="arrow-right" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useLazyAsyncData,
  useBlokkli,
  watch,
  nextTick,
} from '#imports'
import { Sortli, Icon } from '#blokkli/components'
import type { MediaLibraryFilter, MediaLibraryGetResults } from './../types'
import type { BlokkliIcon } from '#blokkli/icons'
import Item from './Item.vue'
import type { DraggableItem, DraggableMediaLibraryItem } from '#blokkli/types'
import { buildDraggableItem, falsy } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

defineProps<{
  isSortli?: boolean
  modelValue?: string
}>()

const { adapter, storage, $t } = useBlokkli()

const selected = ref<string[]>([])
const listEl = ref<HTMLDivElement | null>(null)
const page = ref(0)
const key = computed(() => Object.values(filterValues.value).join(','))

function getDragItems(activeItem?: DraggableItem): DraggableItem[] | null {
  if (!selected.value.length || !listEl.value) {
    return null
  }

  const activeId =
    activeItem?.itemType === 'media_library' ? activeItem.mediaId : null

  const items: DraggableMediaLibraryItem[] = selected.value
    .map((id) => {
      const el = listEl.value?.querySelector(
        `[data-sortli-id="media_library_${id}"]`,
      )
      if (!(el instanceof HTMLElement)) {
        return null
      }

      const item = buildDraggableItem(el)
      if (item?.itemType === 'media_library') {
        return item
      }

      return null
    })
    .filter(falsy)

  if (!activeId) {
    return items
  }

  const activeIsInSelection = items.find((v) => v.mediaId === activeId)

  if (activeIsInSelection) {
    return items
  }

  return null
}

type RenderedFilter = {
  key: string
  filter: MediaLibraryFilter
}

const listView = storage.use<'horizontal' | 'grid'>(
  'mediaLibraryListView',
  'grid',
)

const listViewIcon = computed<BlokkliIcon>(() => {
  if (listView.value === 'grid') {
    return 'list-view-grid'
  }

  return 'list-view-horizontal'
})

const toggleListView = () => {
  listView.value = listView.value === 'grid' ? 'horizontal' : 'grid'
}

const filterValues = ref<Record<string, any>>({})

watch(key, () => {
  page.value = 0
})

const { data, status } =
  await useLazyAsyncData<MediaLibraryGetResults<any> | null>(
    () => {
      return adapter.mediaLibraryGetResults!({
        filters: filterValues.value,
        page: page.value,
      })
    },
    { watch: [key, page] },
  )

watch(data, () => {
  nextTick(() => {
    if (listEl.value) {
      listEl.value.scrollTop = 0
    }
  })
})

const items = computed(() => data.value?.items || [])
const filters = computed<RenderedFilter[]>(() => {
  return Object.entries(data.value?.filters || {}).map(([key, filter]) => {
    return { key, filter }
  })
})

const total = computed(() => data.value?.total || 0)
const perPage = computed(() => data.value?.perPage || 0)

const totalPages = computed(() => {
  return Math.ceil(total.value / perPage.value)
})

onBlokkliEvent('item:dropped', function () {
  selected.value = []
})
</script>
