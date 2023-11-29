<template>
  <PluginSidebar id="debug" title="Debug" icon="bug">
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

const { keyboard, selection } = useParagraphsBuilderStore()
</script>
