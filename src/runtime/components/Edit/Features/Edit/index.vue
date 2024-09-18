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
  if (state.editMode.value !== 'editing') {
    return false
  }

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
    return !!adapter.getLibraryItemEditUrl
  }

  return true
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

    // Open the edit URL in a new window.
    window.open(url, '_blank')?.focus()
    return
  }

  eventBus.emit('item:edit', {
    uuid: item.uuid,
    bundle: item.itemBundle,
  })
}
</script>

<script lang="ts">
export default {
  name: 'Edit',
}
</script>
