<template>
  <div @wheel="onWheel">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'

const { selection } = useBlokkli()

function onWheel(e: WheelEvent) {
  if (selection.isDragging.value) {
    return
  }

  if (e.ctrlKey || e.metaKey) {
    return
  }

  // e.preventDefault()
  e.stopImmediatePropagation()
}
</script>
