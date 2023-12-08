<template>
  <div ref="root" class="bk-scale-to-fit" :style="style">
    <div ref="wrapper" class="bk-scale-to-fit-wrapper">
      <div ref="inner" class="bk-scale-to-fit-wrapper-item" :style="innerStyle">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  width?: number
}>()

const root = ref<HTMLDivElement | null>(null)
const inner = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const rootWidth = ref(260)
const nativeWidth = ref(0)
const nativeHeight = ref(0)
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
    transform: `scale(${rootWidth.value / nativeWidth.value})`,
  }
})

function loop() {
  if (root.value) {
    rootWidth.value = root.value.offsetWidth
  }
  if (inner.value) {
    const rect = inner.value.getBoundingClientRect()
    nativeHeight.value = inner.value.offsetHeight
    nativeWidth.value = Math.max(inner.value.offsetWidth, rootWidth.value)
    computedHeight.value = rect.height
  }

  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
})
</script>
