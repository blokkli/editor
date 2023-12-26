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
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted, onBeforeUnmount } from '#imports'

import { PluginSidebar } from '#blokkli/plugins'
import type { KeyPressedEvent } from '#blokkli/types'

const { keyboard, selection, storage, eventBus, ui } = useBlokkli()

const showDebug = storage.use('showDebug', false)

const visibleViewportOverlayStyle = computed(() => {
  return {
    top: ui.visibleViewport.value.y + 'px',
    left: ui.visibleViewport.value.x + 'px',
    width: ui.visibleViewport.value.width + 'px',
    height: ui.visibleViewport.value.height + 'px',
  }
})

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
