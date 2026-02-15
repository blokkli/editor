<template>
  <PluginItemAction
    id="edit"
    edit-only
    :title="$t('edit', 'Edit...')"
    :disabled="!canEdit"
    meta
    key-code="E"
    icon="bk_mdi_edit"
    :weight="-100"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginItemAction } from '#blokkli/editor/plugins'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
import { featureFragmentNames } from '#blokkli-build/editor-config'
import { fragmentBlockBundle } from '#blokkli-build/config'

defineBlokkliFeature({
  id: 'edit',
  icon: 'bk_mdi_edit',
  label: 'Edit',
  description: 'Provides an action to edit a block.',
  requiredAdapterMethods: ['formFrameBuilder'],
})

const { eventBus, selection, state, $t, adapter, definitions, permissions } =
  useBlokkli()

const userCanEditLibraryItems = computed(() =>
  permissions.hasPermission('edit_library_item'),
)

function isFragment(item: RenderedFieldListItem): boolean {
  return item.bundle === fragmentBlockBundle
}

function isFeatureFragment(item: RenderedFieldListItem): boolean {
  return (
    !!item.fragment?.name && featureFragmentNames.includes(item.fragment.name)
  )
}

const canEdit = computed(() => {
  const item = selection.item.value

  // Editing is only possible when a single block is selected.
  if (!item) {
    return false
  }

  // Fragments provided by features can always be edited.
  if (isFragment(item)) {
    return isFeatureFragment(item)
  }

  const definition = definitions.getBlockDefinition(
    item.bundle,
    item.fieldListType,
    item.parentBlockBundle,
  )

  // Editing is explicitly disabled via the definition.
  if (definition?.editor?.disableEdit) {
    return false
  }

  // For reusable blocks, editing is only possible if the adapter implements
  // the getLibraryItemEditUrl method.
  if (item.library?.libraryItemUuid) {
    if (!userCanEditLibraryItems.value) {
      return false
    }
    return (
      !!adapter.getLibraryItemEditUrl &&
      (state.editMode.value === 'editing' ||
        state.editMode.value === 'translating') &&
      !item.isNew
    )
  }

  return state.editMode.value === 'editing'
})

function onClick(items: RenderedFieldListItem[]) {
  if (items.length !== 1) {
    return
  }

  if (!canEdit.value) {
    return
  }

  const item = items[0]!

  // Because editing library items inside the current context is not (yet)
  // supported, editing has to happen in a separate window where the host
  // context is the library item entity.
  if (item.library?.libraryItemUuid && adapter.getLibraryItemEditUrl) {
    const url = adapter.getLibraryItemEditUrl(item.library.libraryItemUuid)
    eventBus.emit('library:edit-item', {
      url,
      label: item.library.label,
      uuid: item.library.libraryItemUuid,
      blockUuid: item.uuid,
    })
    return
  }

  if (isFragment(item)) {
    if (isFeatureFragment(item)) {
      eventBus.emit('fragment:edit', {
        uuid: item.uuid,
        name: item.fragment!.name,
      })
    }
    return
  }

  eventBus.emit('item:edit', {
    uuid: item.uuid,
    bundle: item.bundle,
  })
}

onBlokkliEvent('item:doubleClick', function (block) {
  onClick([block])
})
</script>

<script lang="ts">
export default {
  name: 'Edit',
}
</script>
