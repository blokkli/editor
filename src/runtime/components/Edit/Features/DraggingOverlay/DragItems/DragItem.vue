<template>
  <div
    ref="rootEl"
    class="bk-dragging-overlay-item"
    :class="{ 'bk-is-top': isTop, 'bk-is-fallback': !markup }"
    :style="{
      width: width + 'px',
      height: height + 'px',
      transformOrigin: transformOrigin,
      background: background,
      '--bk-dragging-scale': to.scaleX,
      '--bk-dragging-radius': Math.max(borderRadius ?? 0, 4),
    }"
  >
    <div
      v-if="markup"
      ref="markupEl"
      class="bk-dragging-overlay-markup"
      v-html="markup"
    />
    <div v-else class="bk-dragging-overlay-fallback">
      <div :style="{ transform: `scale(${1 / to.scaleX})` }">
        <template v-if="isTop">
          <ItemIcon v-if="bundle" :bundle="bundle" />
          <Icon v-else-if="icon" :name="icon" />
          <div v-if="label">{{ label }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, useBlokkli, useTemplateRef } from '#imports'
import { Icon, ItemIcon } from '#blokkli/components'
import { lerp } from '#blokkli/helpers'
import { easeOutElastic } from '#blokkli/helpers/easing'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { BlokkliIcon } from '#blokkli-build/icons'

type AnimationRectangleValues = {
  opacity: number
  scaleX: number
  scaleY: number
  x: number
  y: number
}

export type DragItemData = {
  isTop: boolean
  from: AnimationRectangleValues
  to: AnimationRectangleValues
  width: number
  height: number
  transformOrigin: string
  markup: string
  background: string
  bundle?: string
  icon?: BlokkliIcon
  label?: string
  prevVisibility?: string
  element: HTMLElement
}

const props = defineProps<DragItemData>()

const DURATION = 500

const { ui, theme } = useBlokkli()

const rootEl = useTemplateRef('rootEl')
const markupEl = useTemplateRef('markupEl')

const borderRadius = ref<number | null>(null)
let isDone = false
let animationStart = 0

function setBorderRadius() {
  if (borderRadius.value !== null) {
    return
  }
  // The border radius is only relevant for the item that is "top" (e.g. the
  // one that actually is highlighted).
  if (!props.isTop) {
    borderRadius.value = 4
    return
  }

  if (markupEl.value) {
    const child = markupEl.value.firstChild
    if (child instanceof HTMLElement) {
      const style = theme.getDraggableStyle(child)
      borderRadius.value = style.radiusMin
      return
    }
  }

  borderRadius.value = 4
}

onBlokkliEvent('canvas:draw', (e) => {
  if (isDone || !rootEl.value) {
    return
  }

  if (!animationStart) {
    animationStart = e.time
  }

  setBorderRadius()

  const elapsed = e.time - animationStart
  const alphaX = easeOutElastic(elapsed / DURATION, 1.92, 0.91)
  const alphaY = easeOutElastic(elapsed / DURATION, 2.2, 0.76)
  const opacityAlpha = Math.min(Math.max(elapsed - 300, 0) / 200, 1)

  const from = props.from
  const to = props.to

  if (
    elapsed > DURATION ||
    !ui.useAnimations.value ||
    ui.lowPerformanceMode.value
  ) {
    // Animation done - set final values
    rootEl.value.style.transform = `translate(${to.x}px, ${to.y}px) scale(${to.scaleX}, ${to.scaleY})`
    rootEl.value.style.opacity = String(to.opacity)
    isDone = true
    return
  }

  const newX = lerp(from.x, to.x, alphaX)
  const newY = lerp(from.y, to.y, alphaY)
  const newOpacity = lerp(from.opacity, to.opacity, opacityAlpha)
  const newScaleX = lerp(from.scaleX, to.scaleX, alphaX)
  const newScaleY = lerp(from.scaleY, to.scaleY, alphaY)

  // Directly manipulate DOM - no Vue reactivity involved
  rootEl.value.style.transform = `translate(${newX}px, ${newY}px) scale(${newScaleX}, ${newScaleY})`
  rootEl.value.style.opacity = String(newOpacity)
})

onMounted(() => {
  if (rootEl.value) {
    rootEl.value.style.transform = `translate(${props.from.x}px, ${props.from.y}px) scale(${props.from.scaleX}, ${props.from.scaleY})`
    rootEl.value.style.opacity = String(props.from.opacity)
  }
})
</script>
