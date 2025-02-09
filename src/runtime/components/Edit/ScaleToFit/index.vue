<template>
  <div ref="rootEl" class="bk-scale-to-fit" :style="style">
    <div ref="wrapper" class="bk-scale-to-fit-wrapper">
      <div ref="inner" class="bk-scale-to-fit-wrapper-item" :style="innerStyle">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import useAnimationFrame from '#blokkli/helpers/composables/useAnimationFrame'
import { ref, computed } from '#imports'

const props = defineProps<{
  width?: number
  maxHeight?: number
}>()

const rootEl = ref<HTMLDivElement | null>(null)
const inner = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const rootWidth = ref(260)
const nativeWidth = ref(0)
const nativeHeight = ref(0)
const computedHeight = ref(0)

const scale = computed(() => {
  const contentWidth = props.width || nativeWidth.value
  const widthScale = rootWidth.value / contentWidth

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
