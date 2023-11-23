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
import { buildDraggableItem } from './helpers'
import { AnimationFrameEvent, KeyPressedEvent } from './types'

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

function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}

function onKeyPressed(e: KeyPressedEvent) {
  if (!selectedParagraph.value) {
    return
  }
  if (e.code !== 'Tab') {
    return
  }

  e.originalEvent.preventDefault()

  const paragraphs = [
    ...document.querySelectorAll('[data-uuid]'),
  ] as HTMLElement[]
  if (!paragraphs.length) {
    return
  }

  const currentIndex = selectedParagraph.value
    ? paragraphs.findIndex(
        (v) => v.dataset.uuid === selectedParagraph.value?.uuid,
      )
    : -1

  const targetIndex = modulo(
    e.shift ? currentIndex - 1 : currentIndex + 1,
    paragraphs.length,
  )
  const targetElement = paragraphs[targetIndex]
  if (!targetElement) {
    return
  }
  const targetItem = buildDraggableItem(targetElement)
  if (!targetItem) {
    return
  }

  if (targetItem.itemType !== 'existing') {
    return
  }

  targetElement.scrollIntoView({
    block: 'nearest',
  })

  eventBus.emit('select', targetItem)
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
  eventBus.on('keyPressed', onKeyPressed)
})

onUnmounted(() => {
  eventBus.off('animationFrame', onAnimationFrame)
  eventBus.off('keyPressed', onKeyPressed)
})
</script>

<script lang="ts">
export default {
  name: 'ParagraphActions',
}
</script>
