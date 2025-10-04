<template>
  <div
    ref="el"
    class="bk bk-selection-add-overlay"
    :class="'bk-is-' + placementY"
    :style="{
      '--bk-caret-x': caretX,
    }"
  >
    <div class="bk bk-selection-add-overlay-inner bk-caret-tooltip-inner">
      <div v-if="label" class="bk-selection-add-overlay-label">
        <div v-html="label" />
        <button @click="$emit('close')">
          <Icon name="close" />
        </button>
      </div>
      <div class="bk-selection-add-overlay-list">
        <button
          v-for="item in items"
          :key="item.bundle"
          tabindex="-1"
          @click.prevent="$emit('select', item.bundle)"
        >
          <AddListItemIcon
            :bundle="item.bundle"
            :color="item.isFavorite ? 'yellow' : 'default'"
          />
          <span>{{ item.label }}</span>
        </button>
        <button
          v-for="action in actions"
          :key="'action:' + action.id"
          tabindex="-1"
          @click.prevent="$emit('action', action.id)"
        >
          <AddListItemIcon :icon="action.icon" :color="action.color" />
          <span>{{ action.title }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import useStickyToolbar from '#blokkli/helpers/composables/useStickyToolbar'
import {
  useTemplateRef,
  useBlokkli,
  computed,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import { Icon, AddListItemIcon } from '#blokkli/components'
import { isInternalBundle } from '#blokkli/helpers/bundles'
import type { AddAction } from '#blokkli/types'

type Item = {
  bundle: string
  label: string
  isFavorite: boolean
}

const props = defineProps<{
  bundles: string[]
  anchorEl: HTMLElement
  label?: string
}>()

defineEmits<{
  (e: 'select' | 'action', id: string): void
  (e: 'close'): void
}>()

const el = useTemplateRef('el')

const { types, ui, plugins, storage } = useBlokkli()
const favorites = storage.use<string[]>('blockFavorites', [])

const { placementY, caretX } = useStickyToolbar(el, {
  getAnchorElement() {
    return props.anchorEl
  },
  getPlacementY() {
    return 'auto'
  },
  getPlacementX() {
    return 'center'
  },
  getCaretWidth() {
    return 30
  },
})

const items = computed<Item[]>(() => {
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
})

const actions = computed<AddAction[]>(() => {
  return plugins.getAddActions().filter((action) => {
    if (!action.itemBundle) {
      return true
    }

    return props.bundles.includes(action.itemBundle)
  })
})

onMounted(() => {
  ui.hasAddTooltipOpen.value = true
})

onBeforeUnmount(() => {
  ui.hasAddTooltipOpen.value = false
})
</script>
