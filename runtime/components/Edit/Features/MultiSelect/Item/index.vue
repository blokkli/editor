<template>
  <div
    class="pb-multi-select-rectangle"
    v-show="isIntersecting"
    :style="style"
  ></div>
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
}>()

const style = computed(() => {
  return {
    transform: `translate(${props.rect.x}px, ${props.rect.y}px)`,
    width: props.rect.width + 'px',
    height: props.rect.height + 'px',
  }
})
</script>

<style lang="postcss"></style>
