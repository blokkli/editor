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
import type { DraggableHostData, DropArea } from '#blokkli/types'

defineBlokkliFeature({
  id: 'media-library',
  icon: 'image',
  label: 'Media Library',
  description:
    'Implements a media library to easily drag and drop media like images or videos.',
  requiredAdapterMethods: ['mediaLibraryGetResults', 'mediaLibraryAddBlock'],
})

const { $t, dom, adapter, state, runtimeConfig } = useBlokkli()

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
  return dom
    .getAllDroppableFields()
    .map<DropArea | undefined>((field) => {
      // @TODO: This should be provided by the adapter on the item.
      if (field.droppableEntityType !== 'media') {
        return
      }

      if (!field.droppableEntityBundles.includes(item.mediaBundle)) {
        return
      }
      const isBlock = 'itemBundle' in field.host
      const draggableHost: DraggableHostData = {
        uuid: field.host.uuid,
        type:
          'itemBundle' in field.host
            ? runtimeConfig.itemEntityType
            : field.host.type,
        fieldName: field.fieldName,
      }
      if (adapter.mediaLibraryReplaceMedia && isBlock) {
        return {
          id: `replace-media:${field.host.uuid}:${field.fieldName}`,
          label: $t('mediaLibraryReplaceMedia', 'Replace media'),
          element: field.element,
          icon: 'swap-horizontal',
          onDrop: () => {
            return state.mutateWithLoadingState(
              adapter.mediaLibraryReplaceMedia!({
                host: draggableHost,
                mediaId: item.mediaId,
              }),
              $t('mediaLibraryReplaceFailed', 'Failed to replace media.'),
            )
          },
        }
      } else if (adapter.mediaLibraryReplaceEntityMedia && !isBlock) {
        return {
          id: `replace-entity-media:${field.host.uuid}:${field.fieldName}`,
          label: $t('mediaLibraryReplaceMedia', 'Replace media'),
          element: field.element,
          icon: 'swap-horizontal',
          onDrop: () => {
            return state.mutateWithLoadingState(
              adapter.mediaLibraryReplaceEntityMedia!({
                host: draggableHost,
                mediaId: item.mediaId,
              }),
              $t('mediaLibraryReplaceFailed', 'Failed to replace media.'),
            )
          },
        }
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
