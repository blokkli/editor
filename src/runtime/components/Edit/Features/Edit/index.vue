<template>
  <PluginItemAction
    id="edit"
    :title="$t('edit', 'Edit')"
    :disabled="!canEdit"
    meta
    key-code="E"
    icon="edit"
    :weight="-100"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import type { DraggableExistingBlock } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'
import { getDefinition } from '#blokkli/definitions'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

defineBlokkliFeature({
  id: 'edit',
  icon: 'edit',
  label: 'Edit',
  description: 'Provides an action to edit a block.',
  requiredAdapterMethods: ['formFrameBuilder'],
})

const { eventBus, selection, state, $t, adapter } = useBlokkli()

const block = computed(() => {
  if (selection.blocks.value.length !== 1) {
    return null
  }

  return selection.blocks.value[0]
})

const canEdit = computed(() => {
  // Editing is only possible when a single block is selected.
  if (!block.value) {
    return false
  }

  const definition = getDefinition(
    block.value.itemBundle,
    block.value.hostFieldListType,
    block.value.parentBlockBundle,
  )

  // Editing is explicitly disabled via the definition.
  if (definition?.editor?.disableEdit) {
    return false
  }

  // For reusable blocks, editing is only possible if the adapter implements
  // the getLibraryItemEditUrl method.
  if (block.value.libraryItemUuid) {
    return (
      !!adapter.getLibraryItemEditUrl &&
      (state.editMode.value === 'editing' ||
        state.editMode.value === 'translating') &&
      !block.value.isNew
    )
  }

  return state.editMode.value === 'editing'
})

function onClick(items: DraggableExistingBlock[]) {
  if (items.length !== 1) {
    return
  }

  if (!canEdit.value) {
    return
  }

  const item = items[0]

  // Because editing library items inside the current context is not (yet)
  // supported, editing has to happen in a separate window where the host
  // context is the library item entity.
  if (item.libraryItemUuid && adapter.getLibraryItemEditUrl) {
    const url = adapter.getLibraryItemEditUrl(item.libraryItemUuid)
    eventBus.emit('library:edit-item', {
      url,
      label: item.editTitle,
      uuid: item.libraryItemUuid,
    })
    return
  }

  eventBus.emit('item:edit', {
    uuid: item.uuid,
    bundle: item.itemBundle,
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
