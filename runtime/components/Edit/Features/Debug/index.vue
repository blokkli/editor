<template>
  <PluginSidebar id="debug" title="Debug" icon="bug" v-if="showDebug">
    <div class="pb pb-debug">
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
import { PluginSidebar } from '#pb/plugins'
import { KeyPressedEvent } from '#pb/types'

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
