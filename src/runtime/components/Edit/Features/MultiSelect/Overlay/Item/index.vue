<template>
  <div
    class="bk-multi-select-rectangle"
    :style="style"
    :class="{ 'bk-is-active': isIntersecting }"
  />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type { Rectangle } from '#blokkli/types'

const props = defineProps<{
  rect: Rectangle
  isIntersecting: boolean
  offsetY: number
}>()

const style = computed(() => {
  return {
    transform: `translate(${props.rect.x}px, ${
      props.rect.y + props.offsetY
    }px)`,
    width: props.rect.width + 'px',
    height: props.rect.height + 'px',
  }
})
</script>

<style lang="postcss"></style>
