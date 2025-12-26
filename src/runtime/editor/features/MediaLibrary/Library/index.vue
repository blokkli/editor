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
      <div v-for="filter in filters" :key="filter.name">
        <label v-if="filter.type === 'text'" class="bk-form-text">
          <Icon name="bk_mdi_search" />
          <input
            v-model.lazy="filterValues[filter.name]"
            type="text"
            :placeholder="filter.placeholder"
          />
        </label>
        <label v-else-if="filter.type === 'options'" class="bk-form-select">
          <div v-if="!filterValues[filter.name]">
            {{ filter.label }}
          </div>
          <select v-model="filterValues[filter.name]">
            <option
              v-for="option in filter.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <FormToggle
          v-else-if="filter.type === 'checkbox'"
          v-model="filterValues[filter.name]"
          :label="filter.label"
        />
      </div>
    </div>
    <div
      ref="listEl"
      class="bk-media-library-items bk-scrollbar-light"
      :class="'bk-is-' + listView"
    >
      <Sortli no-transition :get-drag-items="getDragItems" :build-item>
        <Item
          v-for="item in items"
          :key="item.mediaId"
          v-bind="item"
          v-model="selected"
          :class="'bk-is-' + listView"
          :is-disabled="
            !!firstSelectedBundle && item.mediaBundle !== firstSelectedBundle
          "
        />
      </Sortli>
    </div>

    <div v-if="selected.length" class="bk-media-library-cancel">
      <button class="bk-button bk-is-primary" @click.prevent="selected = []">
        {{ $t('cancelSelection', 'Cancel selection') }}
      </button>
    </div>

    <Pagination v-model="page" :total-pages />
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
  useTemplateRef,
} from '#imports'
import { Sortli, Icon, Pagination, FormToggle } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import Item from './Item.vue'
import type {
  DraggableItem,
  DraggableMediaLibraryItem,
  PluginConfigInput,
} from '#blokkli/types'
import { falsy } from '#blokkli/helpers'
import { onBlokkliEvent } from '#blokkli/editor/composables'

defineProps<{
  modelValue?: string
}>()

const { adapter, storage, $t, element } = useBlokkli()

const selected = ref<string[]>([])
const listEl = useTemplateRef('listEl')
const page = ref(0)
const key = computed(() => Object.values(filterValues.value).join(','))

function getDragItems(activeItem?: DraggableItem): DraggableItem[] | null {
  if (!selected.value.length || !listEl.value) {
    return null
  }
  const listElement = listEl.value

  const activeId =
    activeItem?.itemType === 'media_library' ? activeItem.mediaId : null

  const items: DraggableMediaLibraryItem[] = selected.value
    .map((id) => {
      const el = element.query(
        listElement,
        `[data-sortli-id="${id}"]`,
        'Find media library drag item.',
      )
      if (!(el instanceof HTMLElement)) {
        return null
      }

      const item = buildItem(el)
      if (!item) {
        return null
      }

      return item
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

const listView = storage.use<'horizontal' | 'grid'>(
  'mediaLibraryListView',
  'grid',
)

const listViewIcon = computed<BlokkliIcon>(() => {
  if (listView.value === 'grid') {
    return 'bk_mdi_grid_view-fill'
  }

  return 'bk_mdi_lists'
})

const toggleListView = () => {
  listView.value = listView.value === 'grid' ? 'horizontal' : 'grid'
}

const filterValues = ref<Record<string, any>>({})

watch(key, () => {
  page.value = 0
})

const { data, status } = await useLazyAsyncData(
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
const filters = computed<PluginConfigInput[]>(() => {
  return data.value?.filters ?? []
})

/**
 * Determine the bundle of the first selected media library item during multi select.
 *
 * Currently it's only possible to multi select items of the same bundle.
 */
const firstSelectedBundle = computed(() => {
  if (selected.value.length) {
    const item = items.value.find((v) => v.mediaId === selected.value[0])
    if (!item) {
      return null
    }

    return item.mediaBundle ?? null
  }

  return null
})

const total = computed(() => data.value?.total || 0)
const perPage = computed(() => data.value?.perPage || 0)

const totalPages = computed(() => {
  return Math.ceil(total.value / perPage.value)
})

function buildItem(element: HTMLElement): DraggableMediaLibraryItem | null {
  const id = element.dataset.sortliId
  if (!id) {
    return null
  }
  const item = items.value.find((v) => v.mediaId === id)
  if (!item) {
    return null
  }
  return {
    itemType: 'media_library',
    mediaId: item.mediaId,
    mediaBundle: item.mediaBundle ?? '',
    itemBundles: item.targetBundles,
    element: () => element,
  }
}

onBlokkliEvent('item:dropped', function () {
  selected.value = []
})
</script>
