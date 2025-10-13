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
  </ArtboardTooltip>
</template>

<script setup lang="ts">
import { useTemplateRef, useBlokkli, computed } from '#imports'
import { AddListItemIcon, ArtboardTooltip } from '#blokkli/components'
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
  (e: 'select' | 'action', id: string): void
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
  return plugins.getAddActions().filter((action) => {
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
    e.stopPropagation()
  }
}
</script>
