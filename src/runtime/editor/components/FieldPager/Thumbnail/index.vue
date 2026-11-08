<template>
  <div ref="frame" class="absolute inset-0 pointer-events-none" inert>
    <!-- Rendered at 1200 × 800, 3:2 like a page, and scaled down to it. -->
    <div
      ref="canvas"
      class="absolute top-0 left-0 w-[1200px] h-[800px] origin-top-left"
      :class="scale === null ? 'invisible' : ''"
      :style="scale === null ? undefined : { transform: `scale(${scale})` }"
      data-test="field-pager-thumbnail"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from '#imports'
import { onElementResize } from '#blokkli/editor/composables'

const frame = useTemplateRef('frame')
const canvas = useTemplateRef('canvas')

/**
 * Scales the canvas down to the frame: the page, which gets smaller when the
 * pages don't fit.
 */
const scale = ref<number | null>(null)

onElementResize(frame, ({ width }) => {
  const renderWidth = canvas.value?.offsetWidth
  if (renderWidth) {
    scale.value = width / renderWidth
  }
})
</script>
