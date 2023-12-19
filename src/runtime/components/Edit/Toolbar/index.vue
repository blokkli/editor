<template>
  <Teleport to="body">
    <div
      id="bk-sidebar-content"
      class="bk-sidebar"
      :class="{ 'bk-is-hidden': !showSidebar }"
    />

    <Transition name="bk-toolbar">
      <div
        v-show="showToolbar"
        class="bk bk-top bk-control"
        @touchstart.stop
        @touchmove.stop
      >
        <div class="bk bk-toolbar">
          <div class="bk-toolbar-wrapper">
            <ToolbarMenu />

            <div id="bk-toolbar-after-menu" class="bk-toolbar-container" />

            <div id="bk-toolbar-before-title" class="bk-toolbar-container" />

            <div id="bk-toolbar-title" class="bk-toolbar-container" />

            <div id="bk-toolbar-after-title" class="bk-toolbar-container" />
          </div>

          <div class="bk-toolbar-wrapper">
            <div id="bk-toolbar-view-options" class="bk-toolbar-container" />

            <div id="bk-toolbar-before-sidebar" class="bk-toolbar-container" />

            <div class="bk-toolbar-container bk-is-sidebar">
              <div id="bk-sidebar-tabs" class="bk-toolbar-tabs" />
            </div>
            <div
              id="bk-toolbar-before-view-options"
              class="bk-toolbar-container"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { onMounted, useBlokkli, onBeforeUnmount } from '#imports'
import ToolbarMenu from './Menu/index.vue'

const { ui, selection, eventBus, storage } = useBlokkli()

const showToolbar = computed(
  () => !ui.isMobile.value || !selection.isDragging.value,
)

const showSidebar = computed(() => showToolbar.value)
const activeSidebar = storage.use('sidebar:active', '')

const emit = defineEmits(['loaded'])

const onSidebarClose = () => (activeSidebar.value = '')

onMounted(() => {
  emit('loaded')
  eventBus.on('sidebar:close', onSidebarClose)
})

onBeforeUnmount(() => {
  eventBus.off('sidebar:close', onSidebarClose)
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliToolbar',
}
</script>
