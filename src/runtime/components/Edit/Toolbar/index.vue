<template>
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

  <AppMenu />

  <div class="bk bk-toolbar" @touchstart.stop.passive @touchmove.stop.passive>
    <div class="bk bk-toolbar-menu">
      <button class="bk-toolbar-menu-button" @click.prevent.stop="ui.menu.open">
        <Icon name="menu" />
      </button>
    </div>
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

  <div class="bk bk-sidebar-tabs">
    <div id="bk-toolbar-before-sidebar-right" />
    <div
      id="bk-sidebar-tabs-right"
      class="bk-sidebar-container-tabs bk-is-right"
    />
  </div>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { Icon } from '#blokkli/components'
import { onMounted, useBlokkli, onBeforeUnmount, computed } from '#imports'
import AppMenu from './../AppMenu/index.vue'

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
  if (
    (e.target instanceof HTMLElement || e.target instanceof SVGElement) &&
    !e.target.closest('.bk-sidebar-detached')
  ) {
    focusedSidebar.value = ''
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
