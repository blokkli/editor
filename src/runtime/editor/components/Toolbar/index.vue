<template>
  <div
    v-show="activeSidebarLeft && sidebarVisible"
    id="bk-sidebar-content-left"
    class="bk-sidebar bk-is-left bk"
    :class="{ 'bk-is-hidden': !sidebarVisible }"
  />

  <div
    v-show="activeSidebarRight || activeSidebarRightBottom"
    ref="sidebarRightWrapper"
    class="bk bk-sidebar-right-wrapper"
    :class="{
      'bk-is-resizing-split': isResizingSplit,
      'bk-is-split': activeSidebarRightBottom,
    }"
  >
    <div
      v-show="activeSidebarRight"
      id="bk-sidebar-content-right"
      class="bk-sidebar bk-is-right bk border-l border-l-mono-400"
      :class="{ 'bk-is-hidden': !sidebarVisible }"
      :style="rightSidebarStyle"
    />
    <div
      v-show="activeSidebarRight && activeSidebarRightBottom"
      class="bk bk-sidebar-resize"
      @mousedown.prevent.stop="onSplitMouseDown"
    >
      <div>
        <hr />
        <hr />
        <hr />
      </div>
    </div>
    <div
      v-show="activeSidebarRightBottom"
      id="bk-sidebar-content-right-bottom"
      class="bk-sidebar bk-is-right-bottom bk"
      :class="{ 'bk-is-hidden': !sidebarVisible }"
    />
  </div>

  <AppMenu />

  <div class="bk bk-toolbar" @touchstart.stop.passive @touchmove.stop.passive>
    <div
      class="flex h-full"
      :class="{
        'opacity-20 pointer-events-none!': isApproving,
      }"
    >
      <div class="bk bk-toolbar-menu">
        <button
          class="bk-toolbar-menu-button"
          data-test="app-menu-toggle"
          @click.prevent.stop="openMenu"
        >
          <Icon name="bk_mdi_menu" />
        </button>
      </div>
      <div class="bk-toolbar-container">
        <div
          id="bk-sidebar-tabs-left"
          class="bk-sidebar-container-tabs bk-is-left"
        />
      </div>
      <div id="bk-toolbar-after-menu" class="bk-toolbar-container" />
      <div id="bk-toolbar-before-title" class="bk-toolbar-container" />
      <div id="bk-toolbar-title" class="bk-toolbar-container" />
      <div id="bk-toolbar-after-title" class="bk-toolbar-container" />
      <ViewOptions />
      <div id="bk-toolbar-artboard" class="bk-toolbar-container" />
      <div
        id="bk-toolbar-before-sidebar"
        class="bk-sidebar-container-tabs bk-toolbar-container"
      />
    </div>
  </div>

  <div class="bk bk-sidebar-tabs">
    <div
      id="bk-toolbar-before-sidebar-right"
      :class="{
        'opacity-20 pointer-events-none': isApproving,
      }"
    />
    <div
      id="bk-sidebar-tabs-right"
      class="bk-sidebar-container-tabs bk-is-right"
      :class="{
        'opacity-20 pointer-events-none': isApproving,
      }"
    />
    <div
      id="bk-sidebar-tabs-right-bottom"
      class="bk-sidebar-container-tabs bk-is-right"
      :class="{
        'opacity-20 pointer-events-none': isApproving,
      }"
    />
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import {
  onMounted,
  useBlokkli,
  onBeforeUnmount,
  computed,
  ref,
  useTemplateRef,
} from '#imports'
import AppMenu from './../AppMenu/index.vue'
import ViewOptions from './ViewOptions/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const { ui, selection, storage } = useBlokkli()

const isApproving = computed<boolean>(() => ui.isApproving.value)

function openMenu() {
  ui.openDialog({ id: 'menu', alignment: 'left' })
}

const sidebarVisible = computed(() => {
  if (ui.isMobile.value) {
    return !selection.isDragging.value
  }

  return true
})

const activeSidebarLeft = storage.use('sidebar:active:left', '')
const activeSidebarRight = storage.use('sidebar:active:right', '')
const activeSidebarRightBottom = storage.use('sidebar:active:right-bottom', '')
const focusedSidebar = storage.use('sidebar:focused', '')
const splitPercent = storage.use('sidebar:right:split-percent', 50)

const sidebarRightWrapper = useTemplateRef('sidebarRightWrapper')
const activeSplitHeight = ref<number | null>(null)
const isResizingSplit = ref(false)
const splitStartY = ref(0)
const splitStartHeight = ref(0)

const bothSidebarsVisible = computed(
  () => !!activeSidebarRight.value && !!activeSidebarRightBottom.value,
)

const rightSidebarStyle = computed(() => {
  if (!bothSidebarsVisible.value) {
    return {}
  }
  if (activeSplitHeight.value !== null) {
    return { flex: `0 0 ${activeSplitHeight.value}px` }
  }
  return { flex: `0 0 ${splitPercent.value}%` }
})

function onSplitPointerMove(e: MouseEvent) {
  const wrapper = sidebarRightWrapper.value
  if (!wrapper) {
    return
  }
  const wrapperHeight = wrapper.clientHeight
  const delta = e.clientY - splitStartY.value
  const newHeight = Math.min(
    Math.max(splitStartHeight.value + delta, 100),
    wrapperHeight - 100,
  )
  activeSplitHeight.value = newHeight
}

function onSplitPointerUp() {
  const wrapper = sidebarRightWrapper.value
  if (wrapper && activeSplitHeight.value !== null) {
    const wrapperHeight = wrapper.clientHeight
    splitPercent.value = (activeSplitHeight.value / wrapperHeight) * 100
  }
  activeSplitHeight.value = null
  isResizingSplit.value = false
  document.documentElement.style.cursor = ''
  window.removeEventListener('mousemove', onSplitPointerMove)
  window.removeEventListener('mouseup', onSplitPointerUp)
}

function onSplitMouseDown(e: MouseEvent) {
  if (ui.isMobile.value || e.button !== 0) {
    return
  }
  const wrapper = sidebarRightWrapper.value
  if (!wrapper) {
    return
  }
  const wrapperHeight = wrapper.clientHeight
  splitStartY.value = e.clientY
  splitStartHeight.value = (splitPercent.value / 100) * wrapperHeight
  isResizingSplit.value = true
  document.documentElement.style.cursor = 'ns-resize'
  window.addEventListener('mousemove', onSplitPointerMove)
  window.addEventListener('mouseup', onSplitPointerUp)
}

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
  window.removeEventListener('mousemove', onSplitPointerMove)
  window.removeEventListener('mouseup', onSplitPointerUp)
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliToolbar',
}
</script>

<style lang="postcss">
.bk.bk-toolbar-menu {
  @apply relative z-menu h-full;
  grid-area: menu;
  .bk-toolbar-menu-button {
    @apply lg:bg-accent-700 w-toolbar-left flex items-center justify-center text-mono-50 h-full focus:outline-none relative z-50 transition;
    @apply lg:hover:bg-accent-800;

    &.bk-is-active {
      @apply bg-white text-accent-700;
    }

    svg {
      @apply w-[24px] h-[24px] fill-current pointer-events-none;
    }
  }
}

.bk.bk-toolbar {
  @apply relative z-toolbar;
  @apply select-none;
  @apply text-base bg-mono-900 pointer-events-auto;
  contain: style size;
  grid-area: toolbar;
}

.bk {
  .bk-toolbar-container {
    &:not(:first-child) {
      @variant lg {
        @apply border-l border-l-mono-600;
      }
    }
    &:empty {
      @apply hidden;
    }
    @apply relative flex h-full;
    &#bk-toolbar-view-options {
      @apply hidden lg:flex;
    }
    &#bk-toolbar-title {
      @apply flex-1 text-xs lg:text-sm xl:text-base;
      .bk-toolbar-title-scheduled {
        @apply text-sm !leading-none border-r border-r-yellow-dark relative;
        @apply bg-yellow-dark/50 text-yellow-light/90;
        @apply hover:bg-yellow-dark/80 hover:text-yellow-light;
        @apply font-semibold;
        @apply flex items-center gap-10 px-10;
        flex: 0 0 auto;

        .bk-toolbar-title-scheduled-text {
          @apply whitespace-nowrap;
        }

        .bk-icon {
          @apply shrink-0 size-20;
          svg {
            @apply fill-current;
          }
        }
      }
    }
  }
}

.bk {
  .bk-toolbar-button {
    @apply text-mono-200 flex gap-5 items-center px-10 min-w-[50px] justify-center h-40 lg:h-50;

    &:not(.bk-is-active) {
      @apply lg:hover:bg-mono-700;
    }

    &.bk-is-active {
      @apply bg-mono-800;
    }

    &.bk-is-inactive {
      @apply text-mono-600;
    }

    &[disabled] {
      @apply pointer-events-none text-mono-700;
    }
    svg {
      @apply size-18 lg:size-20;
    }
    .bk-icon svg {
      @apply fill-current;
    }
  }
}
</style>
