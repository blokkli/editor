<template>
  <Teleport to="body">
    <div
      v-show="selectedParagraph && !isDragging"
      class="pb pb-paragraph-actions pb-control"
    >
      <div :style="styleSize" class="pb-paragraph-actions-overlay" />

      <div class="pb-paragraph-actions-inner" :style="innerStyle">
        <div id="pb-paragraph-actions-title" />

        <div class="pb-paragraph-actions-buttons" id="pb-paragraph-actions" />

        <div id="pb-paragraph-actions-after"></div>

        <div
          class="pb-paragraph-actions-buttons"
          id="pb-paragraph-actions-options"
        />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { AnimationFrameEvent } from './types'

const showConversions = ref(false)

const { selectedParagraph, isDragging, eventBus } = useParagraphsBuilderStore()

watch(
  () => selectedParagraph.value?.uuid,
  () => {
    showConversions.value = false
  },
)

const bounds = ref({ width: 0, height: 0, left: 0, top: 0 })

const innerStyle = computed(() => {
  const x = Math.max(bounds.value.left, 80)
  const y = Math.min(Math.max(bounds.value.top, 120), window.innerHeight)
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

const styleSize = computed(() => {
  if (!bounds.value) {
    return {}
  }

  const { width, height, left, top } = bounds.value

  return {
    transform: `translate(${left}px, ${top}px)`,
    width: width + 'px',
    height: height + 'px',
  }
})

function onAnimationFrame(e: AnimationFrameEvent) {
  if (!selectedParagraph.value) {
    return
  }
  const rect = e.rects[selectedParagraph.value.uuid]
  if (rect) {
    bounds.value.top = rect.y
    bounds.value.left = rect.x
    bounds.value.width = rect.width
    bounds.value.height = rect.height
  }
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
})

onUnmounted(() => {
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
