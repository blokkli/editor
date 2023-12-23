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
import { computed, useBlokkli } from '#imports'

const { animation, dom, ui } = useBlokkli()

const elements = computed(() => {
  const scale = ui.getArtboardScale()
  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const artboardScroll = artboardEl.scrollTop
  return animation.animationElements.value.map((item) => {
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
  animation.animationElements.value = animation.animationElements.value.filter(
    (v) => v.id !== id,
  )
}
</script>
