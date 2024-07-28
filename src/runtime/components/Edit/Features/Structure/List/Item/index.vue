<template>
  <div
    class="bk-structure-item"
    :class="{ 'bk-is-selected': isSelected }"
    :bk-structure-uuid="uuid"
    @pointerdown.stop.prevent="onMouseDown"
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
import { falsy } from '#blokkli/helpers'

const props = withDefaults(
  defineProps<{
    uuid: string
    bundle: string
    level?: number
    visibleFieldKeys: Record<string, boolean>
    isVisible: boolean
    isSelectedFromParent?: boolean
  }>(),
  {
    level: 0,
  },
)

function getRootEl(): HTMLElement {
  const rootEl = document.querySelector('#bk-structure')

  if (!(rootEl instanceof HTMLElement)) {
    throw new TypeError('Failed to locate root structure element.')
  }

  return rootEl
}

const { runtimeConfig, types, selection, eventBus, state } = useBlokkli()

const canMove = computed(() => state.editMode.value === 'editing')

const isSelected = computed(() => selection.uuids.value.includes(props.uuid))

const type = computed(() => types.getBlockBundleDefinition(props.bundle))

let isDragging = false
let startX = 0
let startY = 0

function onMouseUp(e: MouseEvent) {
  getRootEl().removeEventListener('pointermove', onMouseMove)
  getRootEl().removeEventListener('pointerup', onMouseUp)
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
  return selection.blocks.value
    .map<DraggableExistingStructureBlock | null>((block) => {
      const el = document.querySelector(`[bk-structure-uuid="${block.uuid}"]`)
      if (!(el instanceof HTMLElement)) {
        return null
      }
      return {
        itemType: 'existing_structure',
        uuid: block.uuid,
        itemBundle: block.itemBundle,
        element: function () {
          return el
        },
      }
    })
    .filter(falsy)
}

function onMouseMove(e: MouseEvent) {
  if (!canMove.value) {
    return
  }
  const diff = Math.abs(startX - e.clientX) + Math.abs(startY - e.clientY)

  if (diff > 10) {
    getRootEl().removeEventListener('pointermove', onMouseMove)
    getRootEl().removeEventListener('pointerup', onMouseUp)
    isDragging = true
    startX = 0
    startY = 0

    // The user has started dragging a block that is not yet selected.
    if (!selection.uuids.value.includes(props.uuid)) {
      eventBus.emit('select', props.uuid)
    }

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
  startX = e.clientX
  startY = e.clientY

  getRootEl().addEventListener('pointermove', onMouseMove)
  getRootEl().addEventListener('pointerup', onMouseUp)
}

onBeforeUnmount(() => {
  getRootEl().removeEventListener('pointermove', onMouseMove)
  getRootEl().removeEventListener('pointerup', onMouseUp)
})

defineOptions({
  name: 'StructureListItem',
})
</script>
