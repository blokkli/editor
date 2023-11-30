<template>
  <div
    class="pb-multi-select-rectangle"
    :style="style"
    :class="{ 'pb-is-active': isIntersecting }"
  />
</template>

<script lang="ts" setup>
export type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

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
