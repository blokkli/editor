<template>
  <div
    class="bk-multi-select-rectangle bk-selectable"
    :style="style"
    :class="{ 'bk-is-active': isIntersecting }"
  />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type { DraggableStyle, Rectangle } from '#blokkli/types'

const props = defineProps<{
  rect: Rectangle
  isIntersecting: boolean
  offsetY: number
  style: DraggableStyle
}>()

const style = computed(() => {
  return {
    transform: `translate(${props.rect.x}px, ${
      props.rect.y + props.offsetY
    }px)`,
    width: props.rect.width + 'px',
    height: props.rect.height + 'px',
    borderRadius: props.style.radiusString,
    outlineColor: props.style.contrastColor,
    '--bk-tw-ring-color': props.style.contrastColorTranslucent,
  }
})
</script>

<style lang="postcss"></style>
