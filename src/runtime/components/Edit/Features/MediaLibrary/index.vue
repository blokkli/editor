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
    <Library is-sortli />
  </PluginSidebar>

  <PluginDroppableEdit
    id="media-replace"
    title="Replace media"
    icon="image"
    entity-type="media"
    @save="onDroppableEditSave"
  >
    <Library v-model="selected" />
  </PluginDroppableEdit>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { PluginSidebar, PluginDroppableEdit } from '#blokkli/plugins'
import Library from './Library/index.vue'
import defineDropAreas from '#blokkli/helpers/composables/defineDropAreas'
import { falsy } from '#blokkli/helpers'
import type {
  DraggableHostData,
  DropArea,
  DroppableEntityField,
} from '#blokkli/types'

defineBlokkliFeature({
  id: 'media-library',
  icon: 'image',
  label: 'Media Library',
  description:
    'Implements a media library to easily drag and drop media like images or videos.',
  requiredAdapterMethods: ['mediaLibraryGetResults', 'mediaLibraryAddBlock'],
})

const { $t, dom, adapter, state, runtimeConfig, types } = useBlokkli()

const selected = ref('')

const ERROR_MESSAGE = $t(
  'mediaLibraryReplaceFailed',
  'Failed to replace media.',
)

const onDroppableEditSave = async (e: DroppableEntityField) => {
  if (!selected.value) {
    return
  }
  if ('itemBundle' in e.host && adapter.mediaLibraryReplaceMedia) {
    await state.mutateWithLoadingState(
      () =>
        adapter.mediaLibraryReplaceMedia!({
          host: {
            uuid: e.host.uuid,
            type: runtimeConfig.itemEntityType,
            fieldName: e.fieldName,
          },
          mediaId: selected.value,
        }),
      ERROR_MESSAGE,
    )
  } else if ('type' in e.host && adapter.mediaLibraryReplaceEntityMedia) {
    const type = e.host.type
    await state.mutateWithLoadingState(
      () =>
        adapter.mediaLibraryReplaceEntityMedia!({
          host: {
            uuid: e.host.uuid,
            type,
            fieldName: e.fieldName,
          },
          mediaId: selected.value,
        }),
      ERROR_MESSAGE,
    )
  }
}

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
      const config = types.getDroppableFieldConfig(field.fieldName, field.host)
      // @TODO: This should be provided by the adapter on the item.
      if (config.allowedEntityType !== 'media') {
        return
      }

      if (!config.allowedBundles.includes(item.mediaBundle)) {
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
      const label = $t('mediaLibraryReplaceMedia', 'Replace @field').replace(
        '@field',
        config.label,
      )

      if (adapter.mediaLibraryReplaceMedia && isBlock) {
        return {
          id: `replace-media:${field.host.uuid}:${field.fieldName}`,
          label,
          element: field.element,
          icon: 'swap-horizontal',
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
          id: `replace-entity-media:${field.host.uuid}:${field.fieldName}`,
          label,
          element: field.element,
          icon: 'swap-horizontal',
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
