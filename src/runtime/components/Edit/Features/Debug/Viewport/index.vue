<template>
  <div class="bk-debug-visible-viewport" :style="visibleViewportOverlayStyle">
    <div>Visible Viewport</div>
  </div>
  <div
    class="bk-debug-visible-viewport-padded"
    :style="visibleViewportOverlayPaddedStyle"
  >
    <div>Visible Viewport Padded</div>
  </div>
  <div
    v-for="(rect, i) in viewportBlockingRects"
    :key="i"
    class="bk-debug-viewport-blocking-rect"
    :style="rect"
  />

  <div
    v-for="(line, i) in linesRects"
    :key="i"
    class="bk-debug-viewport-lines"
    :style="line"
  />
</template>

<script setup lang="ts">
import { useBlokkli, computed } from '#imports'
import type { Rectangle } from '#blokkli/types'

const { ui } = useBlokkli()

const rectToStyle = (rect: Rectangle) => {
  return {
    top: rect.y + 'px',
    left: rect.x + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  }
}
const viewportBlockingRects = computed(() =>
  ui.viewportBlockingRects.value.map(rectToStyle),
)

const linesRects = computed(() => {
  const rects: any = []

  ui.viewportBlockingRects.value.forEach((rect) => {
    rects.push(
      rectToStyle({
        x: rect.x,
        y: 0,
        width: 1,
        height: window.innerHeight,
      }),
    )
    rects.push(
      rectToStyle({
        x: rect.x + rect.width,
        y: 0,
        width: 1,
        height: window.innerHeight,
      }),
    )
    rects.push(
      rectToStyle({
        x: 0,
        y: rect.y,
        width: window.innerWidth,
        height: 1,
      }),
    )

    rects.push(
      rectToStyle({
        x: 0,
        y: rect.y + rect.height,
        width: window.innerWidth,
        height: 1,
      }),
    )
  })

  return rects
})

const visibleViewportOverlayStyle = computed(() =>
  rectToStyle(ui.visibleViewport.value),
)

const visibleViewportOverlayPaddedStyle = computed(() =>
  rectToStyle(ui.visibleViewportPadded.value),
)
</script>
