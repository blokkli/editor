<template>
  <Teleport to=".bk-main-canvas">
    <div class="bk-animator">
      <div
        v-for="element in elements"
        v-html="element.markup"
        :style="element.style"
        :key="element.id"
        :class="'bk-is-animation-' + element.mode"
        @animationend="onAnimationEnd(element.id)"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import type { AnimateElementMode, AnimatorAddEvent } from '#blokkli/types'
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

const { ui, eventBus } = useBlokkli()

type AnimationElement = {
  mode: AnimateElementMode
  rect: DOMRect
  top: number
  height?: number
  timestamp: number
  markup: string
  id: string
  el: HTMLElement
}

const animationElements = ref<AnimationElement[]>([])

const elements = computed(() => {
  const scale = ui.getArtboardScale()
  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const artboardScroll = artboardEl.scrollTop
  return animationElements.value.map((item) => {
    const x = (item.rect.x - artboardRect.x) / scale
    const y = (item.rect.y - artboardRect.y) / scale + artboardScroll - item.top
    const width = item.el.offsetWidth + 1
    const height = item.height || item.el.offsetHeight
    return {
      id: item.id,
      mode: item.mode,
      style: {
        top: y + 'px',
        left: x + 'px',
        width: width + 'px',
        height: height + 'px',
      },
      markup: item.markup,
      key: item.timestamp,
    }
  })
})

const onAnimationEnd = (id: string) => {
  animationElements.value = animationElements.value.filter((v) => v.id !== id)
}

const onAnimatorAdd = (e: AnimatorAddEvent) => {
  const el = document.querySelector(`[data-animator-id="${e.id}"]`)
  if (!(el instanceof HTMLElement)) {
    return
  }
  const computedStyle = getComputedStyle(el)
  const marginTop = parseInt(computedStyle.marginTop.replace('px', ''))
  animationElements.value.push({
    mode: e.mode,
    top: marginTop,
    height: e.height,
    rect: el.getBoundingClientRect(),
    timestamp: Date.now(),
    markup: el.outerHTML.replace(/\sdata-\w+="[^"]*"/g, ''),
    id: e.id,
    el,
  })
}

onMounted(() => {
  eventBus.on('animator:add', onAnimatorAdd)
})

onBeforeUnmount(() => {
  eventBus.off('animator:add', onAnimatorAdd)
})
</script>
