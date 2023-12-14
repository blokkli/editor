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
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted, onBeforeUnmount } from '#imports'

import { PluginSidebar } from '#blokkli/plugins'
import type { KeyPressedEvent } from '#blokkli/types'

const { keyboard, selection, storage, eventBus } = useBlokkli()

const showDebug = storage.use('showDebug', false)

const onKeyPress = (e: KeyPressedEvent) => {
  if (e.code === '=' && e.meta) {
    e.originalEvent.preventDefault()
    showDebug.value = !showDebug.value
  }
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPress)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPress)
})
</script>

<script lang="ts">
export default {
  name: 'Debug',
}
</script>
