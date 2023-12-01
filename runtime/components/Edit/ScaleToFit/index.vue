<template>
  <div class="pb-scale-to-fit" :style="style">
    <div ref="wrapper" class="pb-scale-to-fit-wrapper">
      <div ref="inner" class="pb-scale-to-fit-wrapper-item" :style="innerStyle">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  width?: number
}>()

const inner = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const paragraphNativeWidth = ref(0)
const paragraphNativeHeight = ref(0)
const computedHeight = ref(0)
let raf: any = null

const style = computed(() => {
  return {
    height: computedHeight.value + 'px',
  }
})

const innerStyle = computed(() => {
  return {
    width: props.width ? props.width + 'px' : 'auto',
    transform: `scale(${260 / paragraphNativeWidth.value})`,
  }
})

function loop() {
  if (inner.value) {
    const rect = inner.value.getBoundingClientRect()
    paragraphNativeHeight.value = inner.value.offsetHeight
    paragraphNativeWidth.value = Math.max(inner.value.offsetWidth, 260)
    computedHeight.value = rect.height
  }
  if (!paragraphNativeHeight.value) {
    raf = window.requestAnimationFrame(loop)
  }
}

onMounted(() => {
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
})
</script>
