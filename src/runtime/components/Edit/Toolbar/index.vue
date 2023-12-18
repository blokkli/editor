<template>
  <Teleport to="body">
    <div id="bk-sidebar-content" class="bk-sidebar" />

    <div class="bk bk-top bk-control" @touchstart.stop @touchmove.stop>
      <div class="bk bk-toolbar">
        <div class="bk-toolbar-wrapper">
          <ToolbarMenu />

          <div id="bk-toolbar-after-menu" class="bk-toolbar-container" />

          <div id="bk-toolbar-before-title" class="bk-toolbar-container" />

          <div id="bk-toolbar-title" class="bk-toolbar-container" />

          <div id="bk-toolbar-after-title" class="bk-toolbar-container" />
        </div>

        <div class="bk-toolbar-wrapper">
          <div
            id="bk-toolbar-before-view-options"
            class="bk-toolbar-container"
          />

          <div id="bk-toolbar-view-options" class="bk-toolbar-container" />

          <div id="bk-toolbar-before-sidebar" class="bk-toolbar-container" />

          <div class="bk-toolbar-container bk-is-sidebar">
            <div id="bk-sidebar-tabs" class="bk-toolbar-tabs" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { onMounted } from '#imports'
import ToolbarMenu from './Menu/index.vue'

const emit = defineEmits(['loaded'])

onMounted(() => {
  emit('loaded')
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliToolbar',
}
</script>
