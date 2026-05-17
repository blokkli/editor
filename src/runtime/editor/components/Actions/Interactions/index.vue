<template>
  <div class="h-50 w-25 relative border-r border-r-mono-500">
    <InteractionButton
      :disabled="!canSelectParent"
      icon="bk_mdi_arrow_top_left"
      :label="parentButtonLabel"
      class="border-b border-b-mono-500"
      @click.prevent="onClickSelectParent"
    />
    <InteractionButton
      :disabled="!canMove"
      icon="bk_mdi_drag_pan"
      :label="moveButtonLabel"
      class="cursor-grab"
      @pointerdown.stop.prevent="onMovePointerDown"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { toDraggableExisting } from '#blokkli/editor/helpers/draggable'
import InteractionButton from './Button.vue'

const { selection, $t, state, eventBus, ui, types } = useBlokkli()

const canMove = computed<boolean>(() => {
  return !!selection.items.value.length
})

const canSelectParent = computed(() => {
  if (selection.hasHostSelected.value) {
    return false
  }
  const items = selection.items.value
  if (!items.length) {
    return false
  }
  const firstKey = state.getFieldKeyForUuid(items[0]!.uuid)
  if (!firstKey) {
    return false
  }
  return items.every((item) => state.getFieldKeyForUuid(item.uuid) === firstKey)
})

const parentLabel = computed(() => {
  const item = selection.items.value[0]
  if (!item) {
    return ''
  }
  const parentUuid = state.getParentEntityUuid(item.uuid)
  if (!parentUuid) {
    return ''
  }
  const parentItem = state.getFieldListItem(parentUuid)
  if (!parentItem) {
    return ''
  }
  return types.getBlockBundleDefinition(parentItem.bundle)?.label ?? ''
})

const parentButtonLabel = computed(() => {
  return parentLabel.value
    ? $t('actionsSelectParent', 'Select parent (@label)').replace(
        '@label',
        parentLabel.value,
      )
    : $t('selectPage', 'Select page')
})

const moveButtonLabel = computed(() => {
  return selection.uuids.value.length === 1
    ? $t('actionsMoveBlock', 'Move block')
    : $t('actionsMoveBlocks', 'Move @count blocks').replace(
        '@count',
        String(selection.uuids.value.length),
      )
})

function onClickSelectParent() {
  if (!canSelectParent.value) {
    return
  }
  const item = selection.items.value[0]
  if (!item) {
    return
  }
  const parentUuid = state.getParentEntityUuid(item.uuid)
  if (!parentUuid) {
    return
  }
  ui.actionsToolbarLocked.value = true
  if (state.getFieldListItem(parentUuid)) {
    eventBus.emit('select', parentUuid)
    eventBus.emit('scrollIntoView', { uuid: parentUuid })
  } else {
    eventBus.emit('select:unselect')
    eventBus.emit('select:host')
  }
}

function onMovePointerDown(e: PointerEvent) {
  eventBus.emit('dragging:start', {
    items: toDraggableExisting(selection.items.value),
    coords: {
      x: e.clientX,
      y: e.clientY,
    },
    mode: 'mouse',
  })
}
</script>

<script lang="ts">
export default {
  name: 'Interactions',
}
</script>
