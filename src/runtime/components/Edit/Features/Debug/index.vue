<template>
  <PluginSidebar
    v-if="showDebug"
    id="debug"
    title="Debug"
    icon="bug"
    weight="200"
  >
    <div class="bk bk-debug">
      <section>
        <h2>Keyboard</h2>
        <div>
          <div>Space</div>
          <div>{{ keyboard.isPressingSpace.value }}</div>
        </div>
        <div>
          <div>Control</div>
          <div>{{ keyboard.isPressingControl.value }}</div>
        </div>
      </section>

      <section>
        <h2>Selection</h2>
        <div>
          <div>Count</div>
          <div>{{ selection.uuids.value.length }}</div>
        </div>
        <div>
          <div>Is dragging</div>
          <div>{{ selection.isDragging.value }}</div>
        </div>
      </section>
    </div>
  </PluginSidebar>

  <Teleport v-if="showDebug" to="body">
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
      class="bk-debug-viewport-blocking-rect"
      v-for="(rect, i) in viewportBlockingRects"
      :key="i"
      :style="rect"
    />

    <div
      class="bk-debug-viewport-lines"
      v-for="(line, i) in linesRects"
      :key="i"
      :style="line"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  defineBlokkliFeature,
} from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import type { KeyPressedEvent, Rectangle } from '#blokkli/types'

defineBlokkliFeature({
  description: 'Provides debugging functionality.',
})

const { keyboard, selection, storage, eventBus, ui } = useBlokkli()

const showDebug = storage.use('showDebug', false)

const viewportBlockingRects = computed(() =>
  ui.viewportBlockingRects.value.map(rectToStyle),
)

const rectToStyle = (rect: Rectangle) => {
  return {
    top: rect.y + 'px',
    left: rect.x + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  }
}

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

const onKeyPress = (e: KeyPressedEvent) => {
  if (e.code === '=' && e.meta) {
    e.originalEvent.preventDefault()
    showDebug.value = !showDebug.value
  }
}

const onEvent = (name: string, data: any) => {
  if (!showDebug.value) {
    return
  }
  if (name === 'animationFrame' || name === 'animationFrame:before') {
    return
  }
  console.log({ name, data })
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPress)
  eventBus.on('*', onEvent)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPress)
  eventBus.off('*', onEvent)
})
</script>

<script lang="ts">
export default {
  name: 'Debug',
}
</script>
