<template>
  <PluginSidebar
    id="media_library"
    :title="$t('mediaLibrary', 'Media Library')"
    :tour-text="
      $t(
        'mediaLibraryTourText',
        'Search for media like images and drag and drop them into the page.',
      )
    "
    edit-only
    icon="image"
    weight="-100"
  >
    <Library />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import Library from './Library/index.vue'
import defineDropAreas from '#blokkli/helpers/composables/defineDropAreas'
import { falsy } from '#blokkli/helpers'
import type { DropArea } from '#blokkli/types'

defineBlokkliFeature({
  id: 'media-library',
  icon: 'image',
  label: 'Media Library',
  description:
    'Implements a media library to easily drag and drop media like images or videos.',
  requiredAdapterMethods: ['mediaLibraryGetResults', 'mediaLibraryAddBlock'],
})

const { $t, dom, adapter, state } = useBlokkli()

defineDropAreas((dragItems) => {
  // Not supported by adapter.
  if (!adapter.mediaLibraryReplaceMedia) {
    return
  }

  // Only a single item is supported.
  if (dragItems.length !== 1) {
    return
  }

  const item = dragItems[0]

  // Not a media library item.
  if (item.itemType !== 'media_library') {
    return
  }

  // Generate a drop area for every matching droppable field.
  return [...document.querySelectorAll('[data-blokkli-droppable-field]')]
    .map<DropArea | undefined>((element) => {
      if (!(element instanceof HTMLElement)) {
        return
      }
      const fieldName = element.dataset.blokkliDroppableField
      if (!fieldName) {
        return
      }
      const block = dom.findClosestBlock(element)
      if (!block) {
        return
      }
      return {
        id: `replace-media:${block.uuid}:${fieldName}`,
        label: $t('mediaLibraryReplaceMedia', 'Replace media'),
        element,
        icon: 'swap-horizontal',
        onDrop: () => {
          return state.mutateWithLoadingState(
            adapter.mediaLibraryReplaceMedia!({
              blockUuid: block.uuid,
              droppableFieldName: fieldName,
              mediaId: item.mediaId,
            }),
            $t('mediaLibraryReplaceFailed', 'Failed to replace media.'),
          )
        },
      }
    })
    .filter(falsy)
})
</script>

<script lang="ts">
export default {
  name: 'MediaLibrary',
}
</script>
