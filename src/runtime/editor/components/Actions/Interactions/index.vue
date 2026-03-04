<template>
  <div class="bk-blokkli-item-actions-interactions">
    <button
      type="button"
      :disabled="!canSelectParent"
      @click.prevent="onClickSelectParent"
    >
      <Icon name="bk_mdi_arrow_top_left" />
      <div class="bk-tooltip">
        {{
          parentLabel
            ? $t('actionsSelectParent', 'Select parent (@label)').replace(
                '@label',
                parentLabel,
              )
            : $t('actionsSelectPage', 'Select page')
        }}
      </div>
    </button>
    <button
      type="button"
      :disabled="!canMove"
      @pointerdown.stop.prevent="onMovePointerDown"
    >
      <Icon name="bk_mdi_drag_pan" />
      <div class="bk-tooltip">
        {{
          selection.uuids.value.length === 1
            ? $t('actionsMoveBlock', 'Move block')
            : $t('actionsMoveBlocks', 'Move @count blocks').replace(
                '@count',
                String(selection.uuids.value.length),
              )
        }}
      </div>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { toDraggableExisting } from '#blokkli/editor/helpers/draggable'

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
