<template>
  <div
    class="pb-library-list-item"
    data-element-type="reusable"
    :data-paragraph-bundle="bundle"
    :data-library-item-id="id"
    :data-label="label"
    :class="backgroundClass"
  >
    <div class="pb-library-list-item-inner" :style="style">
      <div class="pb-library-paragraph" :style="paragraphStyle">
        <div ref="inner" class="pb-library-paragraph-inner" :style="innerStyle">
          <PbItem :item="item" :paragraph="paragraph" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definitions } from '#nuxt-paragraphs-builder/definitions'
import { PbFieldItemParagraphFragment } from './../../../../../../types'

export type ReusableItem = {
  id: string
  label?: string
  bundle: string
  item: PbFieldItemParagraphFragment
  paragraph: any
}

const props = defineProps<ReusableItem>()

const inner = ref<HTMLDivElement | null>(null)
const paragraphNativeHeight = ref(0)

const style = computed(() => {
  const ratio = 260 / paragraphWidth.value
  return {
    width: '260px',
    height: paragraphNativeHeight.value * ratio + 'px',
  }
})

const definition = computed(() => {
  return definitions.find((v) => v.bundle === props.bundle)
})

const paragraphWidth = computed(() => {
  return definition.value?.editWidth || 600
})

const backgroundClass = computed(() => {
  return definition.value?.editBackgroundClass || ''
})

const innerStyle = computed(() => {
  return {
    width: paragraphWidth.value + 'px',
    transform: `scale(${260 / paragraphWidth.value})`,
  }
})

const paragraphStyle = computed(() => {
  return {}
})

let raf: any = null

function loop() {
  if (inner.value) {
    paragraphNativeHeight.value = inner.value.offsetHeight
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
