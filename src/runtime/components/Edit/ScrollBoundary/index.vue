<template>
  <div @wheel="onWheel">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Provides a boundary for wheel events to make the slot scrollable.
 *
 * During a drag operation the wheel event is propagated so that the artboard
 * always becomes scrollable.
 */
import { useBlokkli } from '#imports'

const { selection } = useBlokkli()

const props = defineProps<{
  /**
   * Allow scrolling during dragging.
   */
  dragging?: boolean
}>()

function onWheel(e: WheelEvent) {
  // Unless allowed via prop, during dragging the only thing that should be
  // scrollable is the artboard.
  if (selection.isDragging.value && !props.dragging) {
    e.preventDefault()
    return
  }

  if (e.ctrlKey || e.metaKey) {
    return
  }

  e.stopImmediatePropagation()
}
</script>
