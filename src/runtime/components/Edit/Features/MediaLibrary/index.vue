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
  return dom
    .getAllDroppableFields()
    .map<DropArea | undefined>((field) => {
      return {
        id: `replace-media:${field.host.uuid}:${field.fieldName}`,
        label: $t('mediaLibraryReplaceMedia', 'Replace media'),
        element: field.element,
        icon: 'swap-horizontal',
        onDrop: () => {
          return state.mutateWithLoadingState(
            adapter.mediaLibraryReplaceMedia!({
              blockUuid: field.host.uuid,
              droppableFieldName: field.fieldName,
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
