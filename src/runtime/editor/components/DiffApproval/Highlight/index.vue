<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      class="bk absolute top-0 left-0 pointer-events-auto origin-top-left"
      :style="containerStyle"
    >
      <Item
        v-for="(item, i) in items"
        :key="item.id"
        ref="itemRefs"
        :uuid="item.uuid"
        :field-name="item.fieldName"
        :value="item.value"
        :selected="!!selected[item.id]"
        :active="i === activeIndex"
        @activate="activeIndex = i"
        @toggle="emit('toggle', item.id)"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef, useBlokkli } from '#imports'
import type { ApprovalItem } from '../types'
import Item from './Item.vue'

defineProps<{
  items: ApprovalItem[]
  selected: Record<number, boolean>
}>()

const emit = defineEmits<{
  (e: 'toggle', id: number): void
}>()

const activeIndex = defineModel<number>({ default: -1 })

const { ui } = useBlokkli()

const itemRefs = useTemplateRef('itemRefs')

const containerStyle = computed(() => {
  const offset = ui.artboardOffset.value
  return {
    width: ui.artboardSize.value.width + 'px',
    height: ui.artboardSize.value.height + 'px',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${ui.artboardScale.value})`,
  }
})

function updateRects() {
  if (itemRefs.value) {
    for (const item of itemRefs.value) {
      if (!item) {
        continue
      }
      item.updateRect()
    }
  }
}

defineExpose({ updateRects })
</script>
