<template>
  <ArtboardTooltip
    id="add-buttons"
    :title="label"
    :anchor-el
    :anchor-coordinates
    class="bk-selection-add-overlay"
    @close="$emit('close')"
    @wheel.stop
  >
    <div
      ref="scrollEl"
      class="bk-selection-add-overlay-wrapper bk-scrollbar-dark"
    >
      <div
        v-if="items.length > 4"
        class="bk-selection-add-overlay-form"
        @pointerdown.stop
        @keydown.capture.stop
        @keyup.capture.stop
      >
        <form
          class="bk-selection-add-overlay-form-input"
          @submit.prevent.stop="onSubmitForm"
        >
          <Icon name="bk_mdi_search" />
          <input
            ref="inputEl"
            v-model="searchText"
            type="text"
            :placeholder="$t('searchBoxPlaceholder', 'Enter search term')"
          />
          <button
            v-if="searchText"
            type="button"
            tabindex="-1"
            @click.prevent="onClearSearchText"
          >
            <Icon name="bk_mdi_close" />
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
        <div class="bk-selection-add-overlay-list" @wheel.passive="onWheel">
          <AddListItem
            v-for="item in filteredItems"
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
import {
  useTemplateRef,
  useBlokkli,
  computed,
  ref,
  watch,
  onMounted,
} from '#imports'
import { ArtboardTooltip, AddListItem, Icon } from '#blokkli/editor/components'
import { isInternalBundle } from '#blokkli/editor/helpers/bundles'
import { Fzf } from 'fzf'
import type { AddListItemProps } from '#blokkli/editor/components/AddListItem/index.vue'
import type { Coord } from '#blokkli/editor/types/geometry'
import type { AddAction } from '#blokkli/editor/types/actions'

const props = defineProps<{
  bundles: string[]
  anchorEl?: HTMLElement
  anchorCoordinates?: Coord
  label: string
  hideActions?: boolean
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
      label: string
      description: string
      props: AddListItemProps
    }
  | {
      type: 'action'
      action: AddAction
      label: string
      description: string
      props: AddListItemProps
    }

const { types, plugins, storage, $t, definitions } = useBlokkli()
const favorites = storage.use<string[]>('blockFavorites', [])

const blocks = computed<Item[]>(() => {
  return props.bundles
    .filter((bundle) => !isInternalBundle(bundle))
    .map((bundle) => {
      const definition = types.getBlockBundleDefinition(bundle)
      return {
        bundle,
        label: definition?.label ?? bundle,
        isAutoAdd: definitions.bundlesWithAutoAdd.value.includes(bundle),
        description: definition?.description ?? '',
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
        label: block.label.toLowerCase(),
        description: block.description,
        props: {
          id: block.bundle,
          label: block.label,
          bundle: block.bundle,
          color: block.isFavorite ? 'yellow' : undefined,
          isAutoAdd: block.isAutoAdd,
          context: 'selection-add-buttons',
        },
      }
    })
})

const actions = computed<Item[]>(() => {
  if (props.hideActions) {
    return []
  }
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
        label: action.title,
        description: action.description ?? '',
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

const fzf = new Fzf(items.value, {
  selector: (item: Item) => item.label + ' ' + item.description,
})

const filteredItems = computed<Item[]>(() => {
  const text = searchText.value.trim()
  if (!text) {
    return items.value
  }

  const results = fzf.find(text)
  const textLower = text.toLowerCase()

  return results
    .map((r) => r.item)
    .sort((a, b) => {
      const aInLabel = a.label.toLowerCase().includes(textLower)
      const bInLabel = b.label.toLowerCase().includes(textLower)
      if (aInLabel && !bInLabel) return -1
      if (!aInLabel && bInLabel) return 1
      return 0
    })
})

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
  const firstResult = filteredItems.value[0]
  if (firstResult) {
    onClick(firstResult)
  }
}

onMounted(() => {
  if (inputEl.value) {
    inputEl.value.focus()
  }
})
</script>
