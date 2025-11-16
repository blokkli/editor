<template>
  <ArtboardTooltip
    id="add-buttons"
    :title="label"
    :anchor-el
    :anchor-coordinates
    class="bk-selection-add-overlay"
    @close="$emit('close')"
  >
    <div
      ref="scrollEl"
      class="bk-selection-add-overlay-wrapper bk-scrollbar-dark"
    >
      <div
        class="bk-selection-add-overlay-form"
        @pointerdown.stop
        @keydown.capture.stop
        @keyup.capture.stop
      >
        <form
          @submit.prevent.stop="onSubmitForm"
          class="bk-selection-add-overlay-form-input"
        >
          <Icon name="search" />
          <input
            ref="inputEl"
            v-model="searchText"
            type="text"
            :placeholder="$t('searchBoxPlaceholder', 'Enter search term')"
          />
          <button
            v-if="searchText"
            type="button"
            @click.prevent="onClearSearchText"
            tabindex="-1"
          >
            <Icon name="close" />
          </button>
        </form>
      </div>
      <div
        ref="wrapperEl"
        :style="{
          width,
          height,
        }"
      >
        <div class="bk-selection-add-overlay-list" @wheel="onWheel">
          <AddListItem
            v-for="item in items"
            v-show="isVisible(item)"
            :key="item.props.id"
            v-bind="item.props"
            @click.prevent="onClick(item)"
          />
        </div>
      </div>
    </div>
  </ArtboardTooltip>
</template>

<script setup lang="ts">
import { useTemplateRef, useBlokkli, computed, ref, watch } from '#imports'
import { ArtboardTooltip, AddListItem, Icon } from '#blokkli/components'
import { isInternalBundle } from '#blokkli/helpers/bundles'
import type { AddAction, Coord } from '#blokkli/types'
import type { AddListItemProps } from '#blokkli/components/AddListItem/index.vue'

const props = defineProps<{
  bundles: string[]
  anchorEl?: HTMLElement
  anchorCoordinates?: Coord
  label: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'action', action: AddAction): void
  (e: 'close'): void
}>()

const searchText = ref('')

const width = ref('auto')
const height = ref('auto')

const wrapperEl = useTemplateRef('wrapperEl')
const scrollEl = useTemplateRef('scrollEl')
const inputEl = useTemplateRef('inputEl')
let hasScrollbar: null | boolean = null

watch(
  searchText,
  () => {
    if (wrapperEl.value) {
      const rect = wrapperEl.value.getBoundingClientRect()
      width.value = rect.width + 'px'
      height.value = rect.height + 'px'
    }
  },
  {
    once: true,
  },
)

function onClearSearchText() {
  if (inputEl.value) {
    inputEl.value.focus()
  }
  searchText.value = ''
}

type Item =
  | {
      type: 'block'
      bundle: string
      searchText: string
      props: AddListItemProps
    }
  | {
      type: 'action'
      action: AddAction
      searchText: string
      props: AddListItemProps
    }

const { types, plugins, storage, $t } = useBlokkli()
const favorites = storage.use<string[]>('blockFavorites', [])

const blocks = computed<Item[]>(() => {
  return props.bundles
    .filter((bundle) => !isInternalBundle(bundle))
    .map((bundle) => {
      return {
        bundle,
        label: types.getBlockBundleDefinition(bundle)?.label ?? bundle,
        isFavorite: favorites.value.includes(bundle),
      }
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return a.label.localeCompare(b.label)
    })
    .map<Item>((block) => {
      return {
        type: 'block',
        bundle: block.bundle,
        searchText: block.label.toLowerCase(),
        props: {
          id: block.bundle,
          label: block.label,
          bundle: block.bundle,
          color: block.isFavorite ? 'yellow' : undefined,
          context: 'selection-add-buttons',
        },
      }
    })
})

const actions = computed<Item[]>(() => {
  return plugins
    .get('addAction')
    .filter((action) => {
      if (!action.itemBundle) {
        return true
      }

      return props.bundles.includes(action.itemBundle)
    })
    .map<Item>((action) => {
      return {
        type: 'action',
        action,
        searchText: action.title + ' ' + (action.description ?? ''),
        props: {
          id: action.id,
          label: action.title,
          color: action.color,
          context: 'selection-add-buttons',
          icon: action.icon,
          noContextMenu: true,
        },
      }
    })
})

const items = computed<Item[]>(() => {
  return [...blocks.value, ...actions.value]
})

function isVisible(item: Item) {
  if (!searchText.value) {
    return true
  }

  return item.searchText.includes(searchText.value)
}

const onWheel = (e: WheelEvent) => {
  if (hasScrollbar === null) {
    const element = scrollEl.value
    hasScrollbar = element && element.scrollHeight > element.clientHeight
  }
  if (hasScrollbar) {
    if (!e.ctrlKey && !e.metaKey) {
      e.stopPropagation()
    }
  }
}

function onClick(item: Item) {
  if (item.type === 'block') {
    emit('select', item.bundle)
  } else if (item.type === 'action') {
    emit('action', item.action)
  }
}

function onSubmitForm() {
  const firstResult = items.value.find((item) => isVisible(item))
  if (firstResult) {
    onClick(firstResult)
  }
}
</script>
