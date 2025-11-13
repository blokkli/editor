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
      ref="listEl"
      class="bk-selection-add-overlay-list bk-scrollbar-dark"
      @wheel="onWheel"
    >
      <AddListItem
        v-for="item in items"
        :id="item.bundle"
        :key="item.bundle"
        context="selection-add-buttons"
        :label="item.label"
        :bundle="item.bundle"
        :color="item.isFavorite ? 'yellow' : undefined"
        tabindex="-1"
        @click.prevent="$emit('select', item.bundle)"
      />
      <AddListItem
        v-for="action in actions"
        :id="action.id"
        :key="'action:' + action.id"
        tabindex="-1"
        context="selection-add-buttons"
        :icon="action.icon"
        :label="action.title"
        :color="action.color"
        no-context-menu
        @click.prevent="$emit('action', action)"
      />
    </div>
  </ArtboardTooltip>
</template>

<script setup lang="ts">
import { useTemplateRef, useBlokkli, computed } from '#imports'
import { ArtboardTooltip, AddListItem } from '#blokkli/components'
import { isInternalBundle } from '#blokkli/helpers/bundles'
import type { AddAction, Coord } from '#blokkli/types'

type Item = {
  bundle: string
  label: string
  isFavorite: boolean
}

const props = defineProps<{
  bundles: string[]
  anchorEl?: HTMLElement
  anchorCoordinates?: Coord
  label: string
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'action', action: AddAction): void
  (e: 'close'): void
}>()

const listEl = useTemplateRef('listEl')
let hasScrollbar: null | boolean = null

const { types, plugins, storage } = useBlokkli()
const favorites = storage.use<string[]>('blockFavorites', [])

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
  return plugins.get('addAction').filter((action) => {
    if (!action.itemBundle) {
      return true
    }

    return props.bundles.includes(action.itemBundle)
  })
})

const onWheel = (e: WheelEvent) => {
  if (hasScrollbar === null) {
    const element = listEl.value
    hasScrollbar = element && element.scrollHeight > element.clientHeight
  }
  if (hasScrollbar) {
    if (!e.ctrlKey && !e.metaKey) {
      e.stopPropagation()
    }
  }
}
</script>
