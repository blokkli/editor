<template>
  <Teleport v-if="!isRenderedDetached" :to="'#bk-sidebar-tabs-' + region">
    <button
      :id="'bk-sidebar-button-' + id"
      ref="tourElement"
      class="bk-toolbar-button group/tooltip"
      :class="[
        { 'bk-is-active': activeSidebar === id && !isDisabled },
        'bk-is-' + region,
      ]"
      :disabled="isDisabled"
      :style="{ order: weight }"
      @click.prevent.stop="toggleSidebar"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <slot name="badge" />
      <Tooltip
        :label="tooltipTitle || title"
        :placement="tooltipPlacement"
        :margin="region === 'left'"
      >
        <template v-if="keyCode" #shortcut>
          <ShortcutIndicator
            :meta
            :shift
            :key-code
            :label="title"
            @pressed="toggleSidebar"
          />
        </template>
      </Tooltip>
    </button>
  </Teleport>

  <Teleport
    v-if="
      (activeSidebar === id || isRenderedDetached || renderAlways) &&
      !isDisabled
    "
    :to="
      isRenderedDetached
        ? ui.mainLayoutElement.value
        : '#bk-sidebar-content-' + region
    "
  >
    <SidebarDetached
      v-if="isRenderedDetached"
      :id
      ref="sidebarDetached"
      :title
      :icon
      :min-width
      :min-height
      :size
      :region
      @attach="onAttachDetached"
    >
      <template #icon>
        <slot name="icon" />
      </template>
      <template #default="{ width, height, isResizing }">
        <div class="bk-sidebar-content-wrapper">
          <Loading v-if="isLoading" white />
          <div ref="sidebarContent" class="bk-sidebar-content">
            <slot
              :key="isRenderedDetached ? 'detached' : 'attached'"
              :scrolled-to-end
              :is-detached="isRenderedDetached"
              :is-shown="isShown"
              :width
              :height
              :toggle-sidebar
              :is-resizing
            />
          </div>
        </div>
      </template>
    </SidebarDetached>
    <ScrollBoundary
      v-else
      v-show="activeSidebar === id"
      class="bk-sidebar-inner"
    >
      <div class="bk">
        <div class="bk-sidebar-title">
          <span>{{ title }}</span>
          <BetaIndicator
            v-if="beta"
            class="mr-auto ml-5"
            :inverted="region === 'right-bottom'"
          />
          <button v-if="!ui.isMobile.value" @click.prevent.stop="onDetach">
            <Icon name="dock-window" />
          </button>
          <button @click.prevent.stop="toggleSidebar">
            <Icon name="bk_mdi_close" />
          </button>
        </div>
      </div>
      <div class="bk-sidebar-content-wrapper">
        <Loading v-if="isLoading" white />
        <div ref="sidebarContent" class="bk-sidebar-content">
          <slot
            :key="isRenderedDetached ? 'detached' : 'attached'"
            :scrolled-to-end="scrolledToEnd"
            :is-detached="isRenderedDetached"
            :is-shown="isShown"
            :width="undefined"
            :height="undefined"
            :toggle-sidebar="toggleSidebar"
            :is-resizing="false"
          />
        </div>
      </div>
    </ScrollBoundary>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  watch,
  ref,
  useBlokkli,
  onBeforeUnmount,
  useTemplateRef,
} from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import {
  Icon,
  ShortcutIndicator,
  ScrollBoundary,
  Loading,
  BetaIndicator,
  Tooltip,
} from '#blokkli/editor/components'
import SidebarDetached from './Detached/index.vue'
import type { Placement, SidebarRegion } from '#blokkli/editor/types/ui'
import {
  defineCommands,
  defineTourItem,
  onBlokkliEvent,
  useAnimationFrame,
} from '#blokkli/editor/composables'

const props = withDefaults(
  defineProps<{
    /**
     * Unique identifier for this sidebar.
     */
    id: string

    /**
     * The title displayed in the sidebar header.
     */
    title: string

    /**
     * The title for the tooltip. Falls back to the title.
     */
    tooltipTitle?: string

    /**
     * Optional text for the interactive tour.
     *
     * If provided, this sidebar will be included in the editor tour.
     */
    tourText?: string

    /**
     * Whether the sidebar is only available in edit mode.
     *
     * If true, the sidebar is hidden in preview mode.
     */
    editOnly?: boolean

    /**
     * The icon displayed in the sidebar toggle button.
     */
    icon: BlokkliIcon

    /**
     * The weight, used for positioning the sidebar button.
     *
     * Lower weights appear first.
     */
    weight: string | number

    /**
     * Whether to always render the sidebar content.
     *
     * By default, content is only rendered when the sidebar is open.
     */
    renderAlways?: boolean

    /**
     * Whether the sidebar is disabled.
     */
    disabled?: boolean

    /**
     * Which region to display the sidebar in.
     *
     * @default 'right'
     */
    region?: SidebarRegion

    /**
     * Minimum width when detached (in pixels).
     */
    minWidth?: number

    /**
     * Minimum height when detached (in pixels).
     */
    minHeight?: number

    /**
     * Default size when detached.
     */
    size?: { width: number; height: number }

    /**
     * Whether the keyboard shortcut needs the meta modifier key.
     *
     * On Mac this is Cmd, on Windows/Linux this is Ctrl.
     */
    meta?: boolean

    /**
     * Whether the keyboard shortcut needs the shift modifier key.
     */
    shift?: boolean

    /**
     * The key code to use for the keyboard shortcut.
     *
     * @example 'l' for the "l" key
     */
    keyCode?: string

    /**
     * Whether to display a BETA indicator badge.
     */
    beta?: boolean

    /**
     * Whether the sidebar content is currently loading.
     *
     * Displays a loading spinner when true.
     */
    isLoading?: boolean
  }>(),
  {
    region: 'right',
    tourText: undefined,
    minWidth: undefined,
    minHeight: undefined,
    size: undefined,
    keyCode: undefined,
    tooltipTitle: undefined,
  },
)

const emit = defineEmits<{
  (e: 'updated' | 'toggle'): void
}>()

const { storage, state, ui, $t } = useBlokkli()

const tourElement = useTemplateRef('tourElement')
const sidebarDetached = useTemplateRef('sidebarDetached')

const detachedKey = computed(() => 'sidebar:detached:' + props.id)
const storageKey = computed(() => 'sidebar:active:' + props.region)
const isDetached = storage.use(detachedKey, false, true)
const isDisabled = computed<boolean>(
  () =>
    (props.editOnly && state.editMode.value !== 'editing') || props.disabled,
)
const activeSidebar = storage.use(storageKey, '', true)

const isRendered = computed(
  () => activeSidebar.value === props.id && !isDisabled.value,
)

watch(
  isRendered,
  (isRendered) => {
    if (isRendered) {
      ui.setActiveSidebar(props.region, props.id)
    } else {
      ui.removeActiveSidebar(props.region, props.id)
    }
  },
  {
    immediate: true,
  },
)

const isRenderedDetached = computed(
  () => isDetached.value && !ui.isMobile.value,
)

const isShown = computed(
  () =>
    (activeSidebar.value === props.id || isRenderedDetached.value) &&
    !isDisabled.value,
)

watch(isDisabled, (v) => {
  if (v && activeSidebar.value === props.id) {
    activeSidebar.value = ''
  }
})

const onDetach = () => {
  isDetached.value = true
  activeSidebar.value = ''
  emit('updated')
}

const onAttachDetached = () => {
  isDetached.value = false
  activeSidebar.value = props.id
  emit('updated')
}

const toggleSidebar = () => {
  emit('toggle')
  if (isDetached.value) {
    isDetached.value = false
    return
  }
  activeSidebar.value = activeSidebar.value === props.id ? '' : props.id
  emit('updated')
}

const showSidebar = () => {
  if (isDetached.value) {
    return
  }
  activeSidebar.value = props.id
}

const sidebarContent = ref<HTMLDivElement | null>(null)
const scrolledToEnd = ref(false)
const isOverflowing = ref(false)

useAnimationFrame(() => {
  if (sidebarContent.value) {
    scrolledToEnd.value =
      sidebarContent.value.scrollHeight -
        (sidebarContent.value.scrollTop + sidebarContent.value.offsetHeight) <
      3

    isOverflowing.value =
      sidebarContent.value.scrollHeight > sidebarContent.value.offsetHeight
  }
})

const tooltipPlacement = computed<Placement>(() => {
  if (props.region === 'left') {
    return 'below-left'
  } else if (props.region === 'right') {
    return 'center-before'
  }

  return 'above-before'
})

const commandTitle = computed(() => {
  if (activeSidebar.value === props.id) {
    return $t('sidebar.hide', 'Hide @title').replace('@title', props.title)
  }
  return $t('sidebar.show', 'Show @title').replace('@title', props.title)
})

const commandCallback = () => {
  if (activeSidebar.value === props.id) {
    activeSidebar.value = ''
  } else {
    activeSidebar.value = props.id
  }
}

defineCommands(() => {
  if (isDisabled.value) {
    return
  }
  return {
    id: 'plugin:sidebar:' + props.id,
    label: commandTitle.value,
    group: 'ui',
    icon: props.icon,
    disabled: isRenderedDetached.value,
    callback: commandCallback,
  }
})

onBlokkliEvent('item:dropped', () => {
  // On mobile we want to close the active sidebar.
  // Some sidebar panes like the media library or clipboard allow drag and drop.
  // During dragging the sidebar is hidden. If dragging ends, the sidebar would
  // be visible again, which is annoying.
  // This is why we hide any sidebar in this case.
  if (ui.isMobile.value && activeSidebar.value) {
    activeSidebar.value = ''
  }
})

onBlokkliEvent('sidebar:open', (id) => {
  if (id === props.id && !isRenderedDetached.value) {
    activeSidebar.value = props.id
  }
})

defineExpose({ showSidebar })

defineTourItem(() => {
  if (!props.tourText) {
    return
  }
  return {
    id: 'plugin:sidebar:' + props.id,
    title: props.title,
    text: props.tourText,
    element: () => tourElement.value ?? sidebarDetached.value?.getRootElement(),
  }
})

onBeforeUnmount(() => {
  ui.removeActiveSidebar(props.region, props.id)
})
</script>

<script lang="ts">
export default {
  name: 'PluginSidebar',
}
</script>

<style lang="postcss">
.bk-html-root {
  --bk-sidebar-width-right: 100vw;
  --bk-toolbar-left-width: 50px;
  --bk-add-item-icon-padding: 6px;
  --bk-item-icon-radius-base-toolbar: 4px;
  --bk-add-item-font-size: 16px;

  @media screen and (min-height: 900px) {
    --bk-toolbar-left-width: 60px;
    --bk-add-item-icon-padding: 8px;
    --bk-item-icon-radius-base-toolbar: 6px;
    --bk-add-item-font-size: 16px;
  }

  @media screen and (min-height: 1100px) {
    --bk-toolbar-left-width: 70px;
    --bk-add-item-icon-padding: 10px;
    --bk-item-icon-radius-base-toolbar: 8px;
    --bk-add-item-font-size: 18px;
  }

  @screen md {
    --bk-sidebar-width-right: 351px;
  }

  @screen 2xl {
    --bk-sidebar-width-right: 400px;
  }

  @screen 3xl {
    --bk-sidebar-width-right: 440px;
  }
}

.bk-sidebar {
  @apply bg-white z-sidebar w-sidebar-right pointer-events-auto;

  .bk-sidebar-padding {
    @apply p-20;
  }

  &.bk-is-right {
    @apply flex-1 min-h-0;
  }

  &.bk-is-right-bottom {
    @apply flex-1 min-h-0;
    .bk-sidebar-title {
      @apply bg-accent-700 text-white !border-b-transparent;

      button {
        @apply text-accent-50 hover:bg-accent-800 hover:text-white;
      }
    }
  }

  &.bk-is-left {
    @apply md:w-[400px];
    grid-area: sidebar-left;
  }

  &:empty {
    @apply hidden;
  }

  &.bk-is-hidden {
    @apply opacity-0 pointer-events-none translate-y-40;
  }
  .bk-sidebar-inner {
    @apply h-full flex flex-col;
  }

  .bk-sidebar-title {
    @apply !font-semibold !font-sans !pl-15 !border-b !border-b-mono-300 flex items-center h-40;
    @apply select-none text-sm;
    @apply bg-mono-200;

    button {
      &:first-of-type {
        @apply ml-auto;
      }
      @apply h-40 text-mono-700 hover:bg-mono-100 hover:text-mono-900 min-w-[40px] flex items-center justify-center;
      svg {
        @apply size-15 fill-current;
      }
    }
  }
}

.bk-sidebar-right-wrapper {
  @apply flex flex-col pointer-events-none bg-white relative z-sidebar;
  grid-area: sidebar-right;
  width: var(--bk-sidebar-width-right);

  > * {
    @apply pointer-events-auto;
  }

  &.bk-is-resizing-split {
    > #bk-sidebar-content-right,
    > #bk-sidebar-content-right-bottom {
      @apply pointer-events-none;
    }
  }

  &.bk-is-split {
    @apply bg-mono-900;
  }

  #bk-sidebar-content-right,
  #bk-sidebar-content-right-bottom {
    @apply relative z-10;
  }
}

.bk-sidebar-content-wrapper {
  @apply flex-1 relative overflow-hidden;
}
.bk-sidebar-content {
  @apply absolute top-0 left-0 w-full h-full overflow-auto;
  &::-webkit-scrollbar {
    display: none;
  }
}

.bk-sidebar-padding {
  @apply p-15 lg:p-20;
}

.bk-sidebar-detached {
  @apply fixed top-0 left-0 bg-white z-sidebar-detached rounded-md flex flex-col overflow-hidden will-change-transform;
  @apply border border-mono-200;
  @apply pointer-events-auto;
  contain: layout paint style;
  &.bk-is-focused {
    @apply shadow-xl border-mono-700;
    .bk-sidebar-title {
      @apply bg-mono-800 text-white;

      button:hover {
        @apply bg-mono-700;
      }
    }
  }
  &:not(.bk-is-focused) {
    .bk-sidebar-detached-inner {
      button,
      li,
      a,
      input,
      textarea {
        @apply pointer-events-none;
      }
    }
  }

  .bk-sidebar-title {
    @apply cursor-move;
    @apply flex bg-mono-300 select-none pl-10 font-semibold text-sm h-40 items-center text-mono-500;

    > .bk-sidebar-title-icon {
      @apply w-20 h-20 mr-5;
      svg {
        @apply fill-current;
      }
    }

    > span {
      @apply mr-auto;
    }

    button {
      @apply w-40 h-40 flex items-center justify-center;
      &:hover {
        @apply bg-mono-400;
      }
      svg {
        @apply w-20 h-20 fill-current;
      }
    }
  }
}

.bk-sidebar-detached-inner {
  @apply h-full flex flex-col relative;
}

.bk-sidebar-detached-handle {
  @apply absolute z-50;

  &.bk-is-bottom {
    @apply bottom-0 h-10 w-full cursor-ns-resize;
  }
  &.bk-is-right {
    @apply right-0 h-full w-10 cursor-ew-resize;
  }
  &.bk-is-bottom-right {
    @apply right-0 bottom-0 h-10 w-10 cursor-se-resize;
  }
}

html.bk-is-sidebar-interacting {
  .bk-sidebar-detached,
  iframe,
  button,
  input,
  textarea,
  a {
    /* @apply !pointer-events-none; */
  }
}

.bk.bk-sidebar-tabs {
  @apply relative bg-mono-900 z-sidebar-tabs left-0 w-full flex justify-between flex-row-reverse overflow-auto lg:overflow-visible h-40 lg:h-auto;
  @apply pointer-events-auto;
  contain: style size;
  grid-area: right;

  > div {
    @apply flex;
  }

  @screen lg {
    @apply flex-col justify-start;

    #bk-sidebar-tabs-right-bottom {
      @apply mt-auto;
    }

    > div {
      @apply min-h-[50px] relative;

      &:first-child {
        &:before {
          content: '';
          @apply absolute bottom-0 left-0 w-full h-1 bg-mono-700;
        }
      }
    }
  }

  button {
    @apply w-50 h-40 relative;
    @apply md:h-50;
  }
}
.bk-sidebar-container-tabs {
  &.bk-is-right {
    @apply flex flex-row;
    @apply lg:flex-col;
  }

  .bk-toolbar-button {
    &:before {
      @apply content-[''] w-0 h-0 border-solid;
      @apply absolute bottom-0 left-[17.5px] transition origin-bottom;
      @apply scale-y-0;
      border-width: 0 8px 6px;
      border-color: transparent transparent #ffffff transparent;
    }

    @screen lg {
      &.bk-is-right,
      &.bk-is-right-bottom {
        &:before {
          border-width: 10px 0 10px 10px;
          border-color: transparent transparent transparent #ffffff;
          @apply absolute top-15 left-0 transition origin-left;
          @apply scale-x-0;
        }
      }
      &.bk-is-left {
        &:before {
          border-width: 0 10px 10px;
          @apply left-15;
        }
      }
    }

    &.bk-is-active {
      @apply bg-mono-700;
      &:before {
        @apply scale-100;
      }
    }
  }
}

.bk-sidebar-badge {
  @apply absolute top-3 right-3 size-18 rounded-full flex items-center justify-center font-bold;
  font-size: 10px;

  &.bk-is-yellow {
    @apply bg-yellow-normal text-yellow-dark;
  }

  &.bk-is-red {
    @apply bg-red-normal text-white;
  }
}

.bk.bk-sidebar-resize {
  flex: 0 0 8px;
  @apply relative cursor-ns-resize z-50;

  &:hover {
    > div {
      @apply opacity-100;
    }
  }

  &:before {
    content: '';
    @apply absolute left-0 w-full;
    @apply h-18 top-1/2 -translate-y-1/2;
  }

  > div {
    @apply opacity-0;
    @apply absolute w-[100px] bg-accent-950 left-1/2 -translate-x-1/2;
    @apply backdrop-blur-xl;
    @apply top-1/2 -translate-y-1/2;
    @apply grid gap-2;
    @apply px-8 py-5 rounded-full;

    hr {
      @apply h-1 border-t border-t-mono-300 bg-mono-700;
    }
  }
}
</style>
