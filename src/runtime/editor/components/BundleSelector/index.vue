<template>
  <ArtboardTooltip
    id="add-buttons"
    :title="label"
    :anchor-el
    :anchor-coordinates
    class="bk-bundle-selector"
    @close="$emit('close')"
    @wheel.stop
  >
    <div ref="scrollEl" class="bk-bundle-selector-wrapper bk-scrollbar-dark">
      <div
        v-if="allItems.length > 4"
        class="bk-bundle-selector-form"
        @pointerdown.stop
        @keydown.capture.stop
        @keyup.capture.stop
      >
        <form
          class="bk-bundle-selector-form-input"
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
          class="bk-bundle-selector-list"
          @wheel.passive="onWheel"
        >
          <AddListItem
            v-for="item in filteredBlocks"
            :key="item.props.id"
            v-bind="item.props"
            @click.prevent="onClick(item)"
          />
        </div>
        <div v-if="filteredActions.length" class="bk-bundle-selector-section">
          <div class="bk-bundle-selector-section-label">
            <span>{{ $t('bundleSelectorActionsLabel', 'Actions') }}</span>
          </div>
          <div class="bk-bundle-selector-list" @wheel.passive="onWheel">
            <AddListItem
              v-for="item in filteredActions"
              :key="item.props.id"
              v-bind="item.props"
              @click.prevent="onClick(item)"
            />
          </div>
        </div>
        <div v-if="filteredFragments.length" class="bk-bundle-selector-section">
          <div class="bk-bundle-selector-section-label">
            <span>{{ $t('bundleSelectorFragmentsLabel', 'Fragments') }}</span>
          </div>
          <div class="bk-bundle-selector-list" @wheel.passive="onWheel">
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
  shallowRef,
  watch,
  onMounted,
} from '#imports'
import { ArtboardTooltip, AddListItem, Icon } from '#blokkli/editor/components'
import { isInternalBundle } from '#blokkli/editor/helpers/bundles'
import { loadFzf, type Fzf } from '#blokkli/editor/libraries/fzf'
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

const fzf = shallowRef<Fzf<Item[]> | null>(null)

onMounted(async () => {
  const { Fzf } = await loadFzf()
  fzf.value = new Fzf(allItems.value, {
    selector: (item: Item) => item.label + ' ' + item.description,
  })
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
  if (!text || !fzf.value) {
    return blocks.value
  }

  const results = fzf.value.find(text)
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

<style lang="postcss">
.bk.bk-bundle-selector {
  --bk-item-width: 270px;
  --bk-columns: 2;
  --bk-bg: theme('colors.mono.900');
  --bk-header-bg: theme('colors.mono.800');
  --bk-header-hover: theme('colors.mono.700');
  --bk-header-text: theme('colors.mono.100');
  --bk-border: theme('colors.mono.500');

  .bk-artboard-tooltip-inner {
    @apply text-white;
  }

  .bk-bundle-selector-wrapper {
    @apply max-h-[60vh] overflow-auto lg:max-h-[500px];
  }

  .bk-bundle-selector-form {
    padding: var(--bk-gap);
    padding-bottom: 0;
  }

  .bk-bundle-selector-form-input {
    @apply relative;
    .bk-icon {
      @apply absolute top-0 left-0 aspect-square h-full p-10;
      svg {
        @apply size-full fill-white;
      }
    }

    input {
      @apply w-full appearance-none bg-mono-950;
      @apply text-white text-lg h-40;
      @apply rounded-md;
      @apply border border-mono-700 pl-40;
      @apply focus:outline-mono-800 focus:shadow-none;
      @apply focus:border-mono-500;
      @apply selection:bg-mono-700;
      @apply placeholder:text-mono-600;
    }

    button {
      @apply absolute right-0 top-0 h-full aspect-square;
    }
  }

  .bk-bundle-selector-list {
    @apply flex flex-wrap items-start;
    padding: calc(var(--bk-gap) / 2);

    max-width: calc(
      var(--bk-item-width) * var(--bk-columns) + var(--bk-gap) *
        (var(--bk-columns) - 1) + 10px
    );
    button {
      width: var(--bk-item-width);
      padding: calc(var(--bk-gap) / 2);
      @apply rounded-md;
      @apply focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-mono-600 focus:!shadow-none;
      @apply self-start;
      .bk-add-item-label {
        @apply pl-10;
      }
    }
  }

  .bk-bundle-selector-section {
    @apply border-t border-mono-700;
  }

  .bk-bundle-selector-section-label {
    @apply flex items-center gap-8 text-mono-400 uppercase font-semibold text-xs tracking-wide !leading-none;
    padding: 15px var(--bk-gap) 0;
  }
}
</style>
