<template>
  <div
    class="bk-structure-item"
    :class="{ 'bk-is-selected': isSelected }"
    :bk-structure-uuid="uuid"
    @mousedown.stop="onMouseDown"
  >
    <button class="bk-structure-item-label">
      <ItemIcon :bundle="bundle" :class="{ 'bk-is-selected': isSelected }" />
      {{ type?.label || bundle }}
    </button>
    <List
      :entity-uuid="uuid"
      :entity-type="runtimeConfig.itemEntityType"
      :entity-bundle="bundle"
      :level="level + 1"
      :visible-field-keys="visibleFieldKeys"
      :is-selected-from-parent="isSelectedFromParent || isSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, computed, onBeforeUnmount } from '#imports'
import List from './../../List/index.vue'
import { ItemIcon } from '#blokkli/components'
import type { DraggableExistingStructureBlock } from '#blokkli/types'

const props = withDefaults(
  defineProps<{
    uuid: string
    bundle: string
    level?: number
    visibleFieldKeys: Record<string, boolean>
    isSelectedFromParent?: boolean
  }>(),
  {
    level: 0,
  },
)

const { runtimeConfig, types, selection, eventBus } = useBlokkli()

const isSelected = computed(() => selection.uuids.value.includes(props.uuid))

const type = computed(() => types.getBlockBundleDefinition(props.bundle))

let isDragging = false
let isMouseDown = false
let startX = 0
let startY = 0

function onMouseUp(e: MouseEvent) {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  if (isDragging) {
    isDragging = false
    return
  }
  if (e.ctrlKey || e.metaKey) {
    eventBus.emit('select:toggle', props.uuid)
  } else {
    eventBus.emit('select', props.uuid)
    eventBus.emit('scrollIntoView', {
      uuid: props.uuid,
      immediate: true,
      center: true,
    })
  }
}

function buildDraggableItems(): DraggableExistingStructureBlock[] {
  return selection.blocks.value.map((block) => {
    return {
      itemType: 'existing_structure',
      uuid: block.uuid,
      itemBundle: block.itemBundle,
      element: function () {
        return document.querySelector(`[bk-structure-uuid="${block.uuid}"]`)
      },
    }
  })
}

function onMouseMove(e: MouseEvent) {
  const diff = Math.abs(startX - e.clientX) + Math.abs(startY - e.clientY)

  if (diff > 10) {
    window.removeEventListener('mousemove', onMouseMove)
    isMouseDown = false
    isDragging = true
    startX = 0
    startY = 0

    eventBus.emit('dragging:start', {
      items: buildDraggableItems(),
      coords: {
        x: e.clientX,
        y: e.clientY,
      },
      mode: 'mouse',
    })
  }
}

function onMouseDown(e: MouseEvent) {
  isMouseDown = true
  startX = e.clientX
  startY = e.clientY

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

defineOptions({
  name: 'StructureListItem',
})
</script>
