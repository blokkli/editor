<template>
  <div ref="rootEl" class="bk-vars bk-scale-to-fit" :style="style">
    <div ref="wrapper" class="bk-scale-to-fit-wrapper">
      <div ref="inner" class="bk-scale-to-fit-wrapper-item" :style="innerStyle">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useTemplateRef } from '#imports'
import { useAnimationFrame } from '#blokkli/editor/composables'

const props = defineProps<{
  width?: number
  maxHeight?: number
}>()

const rootEl = useTemplateRef('rootEl')
const inner = useTemplateRef('inner')
const wrapper = useTemplateRef('wrapper')
const rootWidth = ref(260)
const nativeWidth = ref(0)
const nativeHeight = ref(0)
const computedHeight = ref(0)

const scale = computed(() => {
  const contentWidth = props.width || nativeWidth.value
  const widthScale = Math.min(rootWidth.value, contentWidth) / contentWidth

  if (!props.maxHeight) {
    return widthScale
  }

  const heightScale = props.maxHeight / nativeHeight.value

  return Math.min(widthScale, heightScale)
})

const style = computed(() => {
  const height = props.maxHeight
    ? Math.min(computedHeight.value, props.maxHeight)
    : computedHeight.value

  return {
    height: height + 'px',
  }
})

const innerStyle = computed(() => {
  const currentScale = scale.value
  const contentWidth = props.width || nativeWidth.value
  const scaledWidth = contentWidth * currentScale
  const scaledHeight = nativeHeight.value * currentScale

  const leftOffset = Math.max(0, (rootWidth.value - scaledWidth) / 2)

  const useVerticalCentering =
    props.maxHeight && nativeHeight.value * scale.value > props.maxHeight
  const topOffset = useVerticalCentering
    ? (props.maxHeight - scaledHeight) / 2
    : 0

  return {
    width: props.width ? props.width + 'px' : 'auto',
    transform: `translate(${leftOffset}px, ${topOffset}px) scale(${currentScale})`,
  }
})

useAnimationFrame(() => {
  if (rootEl.value) {
    rootWidth.value = rootEl.value.offsetWidth
  }
  if (inner.value) {
    const rect = inner.value.getBoundingClientRect()
    nativeHeight.value = inner.value.offsetHeight
    nativeWidth.value = Math.max(inner.value.offsetWidth, rootWidth.value)
    computedHeight.value = rect.height
  }
})
</script>

<script lang="ts">
export default {
  name: 'ScaleToFit',
}
</script>

<style lang="postcss">
.bk-vars.bk-scale-to-fit {
  @apply relative;
}

.bk-vars {
  .bk-scale-to-fit-wrapper {
    @apply relative;
  }

  .bk-scale-to-fit-wrapper-item {
    @apply absolute top-0 left-0 pointer-events-none select-none;
    transform-origin: 0 0;
    > * {
      margin: 0 !important;
      pointer-events: none;
    }
    .container {
      margin: 0 !important;
      padding: 0 !important;
    }
  }
}
</style>
