<template>
  <ArtboardTooltip
    id="add-buttons"
    :title="label"
    :anchor-el
    :anchor-coordinates
    class="bk-bundle-selector"
    @close="$emit('close')"
  >
    <div
      ref="scrollEl"
      class="bk-scrollbar-dark max-h-[60vh] overflow-auto lg:max-h-[500px]"
    >
      <div
        v-if="allItems.length > 4"
        class="bk-bundle-selector-form"
        @pointerdown.stop
        @keydown.capture.stop
        @keyup.capture.stop
      >
        <form @submit.prevent.stop="onSubmitForm">
          <FormTextDark
            ref="inputEl"
            v-model="searchText"
            :placeholder="$t('searchBoxPlaceholder', 'Enter search term')"
            clearable
          />
        </form>
      </div>
      <div
        ref="wrapperEl"
        @wheel.passive="onWheel"
        :style="{
          width,
          height,
        }"
      >
        <ItemGroup :items="filteredBlocks" @select="onClick" />
        <ItemGroup
          :label="$t('bundleSelectorActionsLabel', 'Actions')"
          :items="filteredActions"
        />
        <ItemGroup
          :label="$t('bundleSelectorFragmentsLabel', 'Fragments')"
          :items="filteredFragments"
        />
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
import { ArtboardTooltip, FormTextDark } from '#blokkli/editor/components'
import { isInternalBundle } from '#blokkli/editor/helpers/bundles'
import { loadFzf, type Fzf } from '#blokkli/editor/libraries/fzf'
import type { Coord } from '#blokkli/editor/types/geometry'
import type { AddAction } from '#blokkli/editor/types/actions'
import type { BlokkliFieldElement } from '#blokkli/editor/types/field'
import { fragmentBlockBundle } from '#blokkli-build/config'
import type { Item } from './types'
import ItemGroup from './Group.vue'

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
  --bk-bg: theme('colors.mono.900');
  --bk-header-bg: theme('colors.mono.800');
  --bk-header-hover: theme('colors.mono.700');
  --bk-header-text: theme('colors.mono.100');
  --bk-border: theme('colors.mono.500');

  .bk-artboard-tooltip-inner {
    @apply text-white;
  }
}
</style>
