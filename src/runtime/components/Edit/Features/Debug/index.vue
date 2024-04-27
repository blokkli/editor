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
        <div class="bk-debug-list">
          <div>
            <div>Space</div>
            <div>{{ keyboard.isPressingSpace.value }}</div>
          </div>
          <div>
            <div>Control</div>
            <div>{{ keyboard.isPressingControl.value }}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Selection</h2>
        <div class="bk-debug-list">
          <div>
            <div>Count</div>
            <div>{{ selection.uuids.value.length }}</div>
          </div>
          <div>
            <div>Is dragging</div>
            <div>{{ selection.isDragging.value }}</div>
          </div>
          <div>
            <div>Is multiselecting</div>
            <div>{{ selection.isMultiSelecting.value }}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Rendering</h2>
        <div class="bk-debug-list">
          <div>
            <label class="bk-checkbox-toggle">
              <input v-model="showDebugViewport" type="checkbox" class="peer" />
              <div />
              <span>Show viewport overlay</span>
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2>Icons</h2>
        <div class="bk-debug-icons">
          <div v-for="icon in iconItems" :key="icon">
            <Icon :name="icon" />
            <p>{{ icon }}</p>
          </div>
        </div>
      </section>

      <section>
        <h2>Features</h2>
        <div class="bk-debug-features">
          <div v-for="feature in featuresList" :key="feature.id">
            <div>
              <span
                class="bk-status-indicator"
                :class="feature.mounted ? 'bk-is-success' : 'bk-is-danger'"
              ></span>
            </div>
            <div>
              <h3>{{ feature.label }}</h3>
              <div>{{ feature.id }}</div>
              <p>{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </PluginSidebar>

  <Teleport v-if="showDebug && showDebugViewport" to="body">
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
  </Teleport>
  <Teleport v-if="showDebug" to="body">
    <div class="bk-debug-rects">
      <canvas
        ref="canvasRects"
        :style="{
          width: ui.viewport.value.width + 'px',
          height: ui.viewport.value.height + 'px',
        }"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  defineBlokkliFeature,
  computed,
} from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'
import { icons, type BlokkliIcon } from '#blokkli/icons'
import type { Rectangle } from '#blokkli/types'
import { featureComponents } from '#blokkli-runtime/features'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

defineBlokkliFeature({
  id: 'debug',
  label: 'Debug',
  icon: 'bug',
  description: 'Provides debugging functionality.',
})

const { keyboard, selection, storage, eventBus, ui, features, dom } =
  useBlokkli()

const showDebug = storage.use('showDebug', false)
const showDebugViewport = storage.use('showDebugViewport', false)
const canvasRects = ref<HTMLCanvasElement | null>(null)

const viewportBlockingRects = computed(() =>
  ui.viewportBlockingRects.value.map(rectToStyle),
)

const iconItems = computed(() => Object.keys(icons) as BlokkliIcon[])

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

const featuresList = computed(() => {
  return featureComponents.map((v) => {
    const feature = features.features.value.find((f) => f.id === v.id)
    return {
      id: v.id,
      label: v.label,
      description: v.description,
      dependencies: v.dependencies.join(', '),
      mounted: !!feature,
    }
  })
})

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === '=' && e.meta) {
    e.originalEvent.preventDefault()
    showDebug.value = !showDebug.value
  }
})

const onEvent = (name: string, data: any) => {
  if (!showDebug.value) {
    return
  }
  if (
    name === 'animationFrame' ||
    name === 'animationFrame:before' ||
    name === 'canvas:draw'
  ) {
    return
  }
  console.log({ name, data })
}

onBlokkliEvent('canvas:draw', (e) => {
  if (!canvasRects.value) {
    return
  }

  canvasRects.value.width = ui.viewport.value.width
  canvasRects.value.height = ui.viewport.value.height

  const ctx = canvasRects.value.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.clearRect(0, 0, ui.viewport.value.width, ui.viewport.value.height)
  const blockRects = dom.getBlockRects()

  const rects = Object.values(blockRects)

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]

    ctx.rect(
      rect.x * e.artboardScale + e.artboardOffset.x,
      rect.y * e.artboardScale + e.artboardOffset.y,
      rect.width * e.artboardScale,
      rect.height * e.artboardScale,
    )
    ctx.stroke()
  }
})

onMounted(() => {
  eventBus.on('*', onEvent)
})

onBeforeUnmount(() => {
  eventBus.off('*', onEvent)
})
</script>

<script lang="ts">
export default {
  name: 'Debug',
}
</script>
