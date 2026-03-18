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
        v-if="allItems.length > 4"
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
        <div
          v-if="filteredBlocks.length"
          class="bk-selection-add-overlay-list"
          @wheel.passive="onWheel"
        >
          <AddListItem
            v-for="item in filteredBlocks"
            :key="item.props.id"
            v-bind="item.props"
            @click.prevent="onClick(item)"
          />
        </div>
        <div
          v-if="filteredActions.length"
          class="bk-selection-add-overlay-section"
        >
          <div class="bk-selection-add-overlay-section-label">
            <span>{{ $t('bundleSelectorActionsLabel', 'Actions') }}</span>
          </div>
          <div class="bk-selection-add-overlay-list" @wheel.passive="onWheel">
            <AddListItem
              v-for="item in filteredActions"
              :key="item.props.id"
              v-bind="item.props"
              @click.prevent="onClick(item)"
            />
          </div>
        </div>
        <div
          v-if="filteredFragments.length"
          class="bk-selection-add-overlay-section"
        >
          <div class="bk-selection-add-overlay-section-label">
            <span>{{ $t('bundleSelectorFragmentsLabel', 'Fragments') }}</span>
          </div>
          <div class="bk-selection-add-overlay-list" @wheel.passive="onWheel">
            <AddListItem
              v-for="item in filteredFragments"
              :key="item.props.id"
              v-bind="item.props"
              @click.prevent="onClick(item)"
            />
          </div>
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
import type { BlokkliFieldElement } from '#blokkli/editor/types/field'
import { fragmentBlockBundle } from '#blokkli-build/config'

const props = defineProps<{
  bundles: string[]
  anchorEl?: HTMLElement
  anchorCoordinates?: Coord
  label: string
  hideActions?: boolean
  field?: BlokkliFieldElement
}>()

const emit = defineEmits<{
  (e: 'select' | 'fragment', id: string): void
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
  | {
      type: 'fragment'
      name: string
      label: string
      description: string
      props: AddListItemProps
    }

const { types, plugins, storage, $t, definitions, permissions, ui } =
  useBlokkli()
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

const fragments = computed<Item[]>(() => {
  if (!props.field || !props.field.allowedFragments.length) {
    return []
  }

  if (!props.bundles.includes(fragmentBlockBundle)) {
    return []
  }

  if (!permissions.checkBlockBundlePermission(fragmentBlockBundle, 'add')) {
    return []
  }

  return props.field.allowedFragments
    .map((name) => {
      const definition = definitions.getFragmentDefinition(name)
      if (!definition) {
        return null
      }
      return {
        type: 'fragment' as const,
        name,
        label: definition.label,
        description: definition.description ?? '',
        props: {
          id: 'fragment:' + name,
          label: definition.label,
          color: 'accent' as const,
          context: 'selection-add-buttons' as const,
          icon: definition.editor?.icon ?? 'bk_mdi_newspaper',
          noContextMenu: true,
        },
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
})

const actions = computed<Item[]>(() => {
  if (props.hideActions) {
    return []
  }
  return plugins
    .get('addAction')
    .filter((action) => {
      if (action.id === 'fragment' && fragments.value.length) {
        return false
      }

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

const allItems = computed<Item[]>(() => {
  return [...blocks.value, ...fragments.value, ...actions.value]
})

const fzf = new Fzf(allItems.value, {
  selector: (item: Item) => item.label + ' ' + item.description,
})

function filterBySearch<T extends Item>(items: T[]): T[] {
  const text = searchText.value.trim()
  if (!text) {
    return items
  }
  const textLower = text.toLowerCase()
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(textLower) ||
      item.description.toLowerCase().includes(textLower),
  )
}

const filteredBlocks = computed<Item[]>(() => {
  const text = searchText.value.trim()
  if (!text) {
    return blocks.value
  }

  const results = fzf.find(text)
  const textLower = text.toLowerCase()

  return results
    .map((r) => r.item)
    .filter((item) => item.type === 'block')
    .sort((a, b) => {
      const aInLabel = a.label.toLowerCase().includes(textLower)
      const bInLabel = b.label.toLowerCase().includes(textLower)
      if (aInLabel && !bInLabel) return -1
      if (!aInLabel && bInLabel) return 1
      return 0
    })
})

const filteredFragments = computed(() => filterBySearch(fragments.value))
const filteredActions = computed(() => filterBySearch(actions.value))

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
  } else if (item.type === 'fragment') {
    emit('fragment', item.name)
  }
}

function onSubmitForm() {
  const firstResult =
    filteredBlocks.value[0] ??
    filteredFragments.value[0] ??
    filteredActions.value[0]
  if (firstResult) {
    onClick(firstResult)
  }
}

onMounted(() => {
  if (inputEl.value) {
    inputEl.value.focus()
  }

  if (!ui.isMobile.value) {
    // Wait one frame for useStickyToolbar to position the tooltip, then
    // calculate a dynamic max-height based on available viewport space.
    requestAnimationFrame(() => {
      if (!scrollEl.value) {
        return
      }
      const rect = scrollEl.value.getBoundingClientRect()
      const available = window.innerHeight - rect.top - 30
      if (available > 0) {
        scrollEl.value.style.maxHeight = Math.max(available, 200) + 'px'
      }
    })
  }
})
</script>
