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
    icon="bk_mdi_image"
    weight="-100"
  >
    <Library is-sortli />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import Library from './Library/index.vue'
import { falsy } from '#blokkli/helpers'
import type { DraggableHostData, DropArea } from '#blokkli/types'
import { itemEntityType } from '#blokkli-build/config'
import { defineDropAreas } from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'media-library',
  icon: 'bk_mdi_image',
  label: 'Media Library',
  description:
    'Implements a media library to easily drag and drop media like images or videos.',
  requiredAdapterMethods: ['mediaLibraryGetResults', 'mediaLibraryAddBlock'],
})

const { $t, adapter, state, types, directive } = useBlokkli()

const ERROR_MESSAGE = $t(
  'mediaLibraryReplaceFailed',
  'Failed to replace media.',
)

defineDropAreas((dragItems) => {
  // Not supported by adapter.
  if (!adapter.mediaLibraryReplaceMedia) {
    return
  }

  // Only a single item is supported.
  if (dragItems.length !== 1) {
    return
  }

  const item = dragItems[0]!

  // Not a media library item.
  if (item.itemType !== 'media_library') {
    return
  }

  // @TODO: Restore this behaviour.
  // Ignore elements that are rendered inside a field that uses proxy mode, since implementations might use <BlokkliItem> to render blocks in a proxy-mode field.
  // return !el.closest('[data-bk-in-proxy="true"]')

  // Generate a drop area for every matching droppable field.
  return directive
    .getDroppableElements()
    .map<DropArea | undefined>((field) => {
      const config = types.getDroppableFieldConfig(field.fieldName, field)
      // @TODO: This should be provided by the adapter on the item.
      if (config.allowedEntityType !== 'media') {
        return
      }

      if (!config.allowedBundles.includes(item.mediaBundle)) {
        return
      }
      const isBlock = field.type === itemEntityType
      const draggableHost: DraggableHostData = {
        uuid: field.uuid,
        type: field.type,
        fieldName: field.fieldName,
      }
      const label = $t('mediaLibraryReplaceMedia', 'Replace @field').replace(
        '@field',
        config.label,
      )

      if (adapter.mediaLibraryReplaceMedia && isBlock) {
        return {
          id: `replace-media:${field.uuid}:${field.fieldName}`,
          label,
          element: field.element,
          icon: 'bk_mdi_swap_horiz',
          onDrop: () => {
            return state.mutateWithLoadingState(
              () =>
                adapter.mediaLibraryReplaceMedia!({
                  host: draggableHost,
                  mediaId: item.mediaId,
                }),
              ERROR_MESSAGE,
            )
          },
        }
      } else if (adapter.mediaLibraryReplaceEntityMedia && !isBlock) {
        return {
          id: `replace-entity-media:${field.uuid}:${field.fieldName}`,
          label,
          element: field.element,
          icon: 'bk_mdi_swap_horiz',
          onDrop: () => {
            return state.mutateWithLoadingState(
              () =>
                adapter.mediaLibraryReplaceEntityMedia!({
                  host: draggableHost,
                  mediaId: item.mediaId,
                }),
              ERROR_MESSAGE,
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
