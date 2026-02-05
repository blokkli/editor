<template>
  <Teleport :to="ui.mainLayoutElement.value" defer>
    <BlokkliTransition name="search">
      <div
        v-if="isRendered"
        v-show="isVisible"
        class="bk bk-search"
        :class="{ 'bk-is-translucent': selection.isDragging.value }"
        @click.stop.prevent="isVisible = false"
      >
        <Overlay
          ref="overlay"
          :visible="isVisible"
          :is-dragging="selection.isDragging.value"
          @close="isVisible = false"
        />
      </div>
    </BlokkliTransition>
  </Teleport>
  <PluginToolbarButton
    id="search"
    :title="$t('searchToolbarLabel', 'Search content')"
    meta
    key-code="F"
    region="before-sidebar-right"
    :tour-text="
      $t(
        'searchTourText',
        'Quickly find blocks on the current page or existing content to drag and drop as blocks into the page.',
      )
    "
    icon="bk_mdi_search"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import {
  nextTick,
  ref,
  useBlokkli,
  defineBlokkliFeature,
  useTemplateRef,
} from '#imports'
import Overlay from './Overlay/index.vue'
import { BlokkliTransition } from '#blokkli/editor/components'
import { PluginToolbarButton } from '#blokkli/editor/plugins'
import { onBlokkliEvent, defineDropAreas } from '#blokkli/editor/composables'
import { falsy } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'
import type { DropArea } from '#blokkli/editor/types/ui'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'

defineBlokkliFeature({
  id: 'search',
  icon: 'bk_mdi_search',
  label: 'Search',
  description:
    'Provides an overlay with shortcut to search for blocks on the current page or existing content to add as blocks.',
})

const { $t, selection, ui, adapter, state, types, directive } = useBlokkli()

const ERROR_MESSAGE = $t(
  'searchContentReplaceFailed',
  'Failed to replace content.',
)

defineDropAreas((dragItems) => {
  if (!adapter.replaceContentSearchItem) {
    return
  }

  if (dragItems.length !== 1) {
    return
  }

  const item = dragItems[0]!

  if (item.itemType !== 'search_content') {
    return
  }

  const searchItem = item.searchItem

  return directive
    .getDroppableElements()
    .map<DropArea | undefined>((field) => {
      if (field.type !== itemEntityType) {
        return
      }

      const config = types.getDroppableFieldConfig(field.fieldName, field)
      const allowedBundles = config.allowed.find(
        (v) => v.type === searchItem.entityType,
      )?.bundles
      if (
        !allowedBundles ||
        !allowedBundles.includes(searchItem.entityBundle)
      ) {
        return
      }

      const host: BlokkliItemHost = {
        uuid: field.uuid,
        type: field.type,
        fieldName: field.fieldName,
      }

      const label = $t('searchContentReplace', 'Replace @field').replace(
        '@field',
        config.label,
      )

      return {
        id: `replace-search-content:${field.uuid}:${field.fieldName}`,
        label,
        element: field.element,
        icon: 'bk_mdi_swap_horiz',
        onDrop: () => {
          return state.mutateWithLoadingState(
            () =>
              adapter.replaceContentSearchItem!({
                host,
                item: searchItem,
              }),
            ERROR_MESSAGE,
          )
        },
      }
    })
    .filter(falsy)
})

const isRendered = ref(false)
const isVisible = ref(false)

const overlay = useTemplateRef('overlay')

function onClick() {
  isRendered.value = true
  isVisible.value = !isVisible.value
  nextTick(() => {
    if (isVisible.value && overlay.value) {
      overlay.value.focusInput()
    }
  })
}

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value) {
    return
  }
  if (e.code === 'Escape') {
    isVisible.value = false
  }
})
</script>

<script lang="ts">
export default {
  name: 'FeatureSearch',
}
</script>
