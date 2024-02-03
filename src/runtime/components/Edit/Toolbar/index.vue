<template>
  <Teleport to="body">
    <div
      v-show="activeSidebarLeft && sidebarVisible"
      id="bk-sidebar-content-left"
      class="bk-sidebar bk-is-left"
      :class="{ 'bk-is-hidden': !sidebarVisible }"
    />
    <div
      v-show="activeSidebarRight"
      id="bk-sidebar-content-right"
      class="bk-sidebar bk-is-right"
      :class="{ 'bk-is-hidden': !sidebarVisible }"
    />

    <Transition name="bk-toolbar">
      <div v-show="showToolbar" class="bk bk-top">
        <div class="bk-toolbar bk-control" @touchstart.stop @touchmove.stop>
          <div id="bk-toolbar-menu" class="bk-toolbar-area bk-is-menu" />
          <div class="bk-toolbar-container bk-is-sidebar">
            <div
              id="bk-sidebar-tabs-left"
              class="bk-sidebar-container-tabs bk-is-left"
            />
          </div>
          <div id="bk-toolbar-after-menu" class="bk-toolbar-container" />
          <div id="bk-toolbar-before-title" class="bk-toolbar-container" />
          <div id="bk-toolbar-title" class="bk-toolbar-container" />
          <div id="bk-toolbar-after-title" class="bk-toolbar-container" />
          <div id="bk-toolbar-view-options" class="bk-toolbar-container" />
          <div
            id="bk-toolbar-before-sidebar"
            class="bk-sidebar-container-tabs bk-toolbar-container"
          />
        </div>
        <div
          class="bk bk-sidebar-tabs"
          :class="{ 'bk-has-sidebar-open': activeSidebarRight }"
        >
          <div id="bk-toolbar-before-sidebar-right" />
          <div
            id="bk-sidebar-tabs-right"
            class="bk-sidebar-container-tabs bk-is-right"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { onMounted, useBlokkli, onBeforeUnmount, computed } from '#imports'

const { ui, selection, storage } = useBlokkli()

const showToolbar = computed(
  () =>
    !ui.isMobile.value ||
    (!selection.isDragging.value && !selection.isMultiSelecting.value),
)

const sidebarVisible = computed(() => {
  if (ui.isMobile.value) {
    return !selection.isDragging.value
  }

  return true
})

const activeSidebarLeft = storage.use('sidebar:active:left', '')
const activeSidebarRight = storage.use('sidebar:active:right', '')
const focusedSidebar = storage.use('sidebar:focused', '')

const emit = defineEmits(['loaded'])

const onWindowMouseDown = (e: MouseEvent) => {
  if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
    if (!e.target.closest('.bk-sidebar-detached')) {
      focusedSidebar.value = ''
    }
  }
}

onBlokkliEvent('sidebar:close', () => (activeSidebarRight.value = ''))

onMounted(() => {
  emit('loaded')
  document.documentElement.addEventListener('mousedown', onWindowMouseDown)
})

onBeforeUnmount(() => {
  document.documentElement.removeEventListener('mousedown', onWindowMouseDown)
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliToolbar',
}
</script>
