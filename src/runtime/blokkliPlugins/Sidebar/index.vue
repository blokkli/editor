<template>
  <Teleport v-if="!isRenderedDetached" :to="'#bk-sidebar-tabs-' + region">
    <button
      class="bk-toolbar-button"
      :class="[{ 'is-active': activeSidebar === id }, 'bk-is-' + region]"
      :disabled="editOnly && state.editMode.value !== 'editing'"
      :style="{ order: weight }"
      @click.prevent.stop="toggleSidebar(id)"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        <span>{{ title }}</span>
        <ShortcutIndicator
          v-if="keyCode"
          :meta="meta"
          :shift="shift"
          :key-code="keyCode"
          :label="title"
          @pressed="toggleSidebar(id)"
        />
      </div>
    </button>
  </Teleport>

  <Teleport
    v-if="activeSidebar === id || isRenderedDetached || renderAlways"
    :to="isRenderedDetached ? 'body' : '#bk-sidebar-content-' + region"
  >
    <SidebarDetached
      v-if="isRenderedDetached"
      :id="id"
      :title="title"
      :icon="icon"
      :min-width="minWidth"
      :min-height="minHeight"
      :size="size"
      :is-left="region === 'left'"
      class="bk-sidebar-inner"
      @wheel="onWheel"
      @close="onAttach"
    >
      <template #icon>
        <slot name="icon" />
      </template>
      <template #default="{ width, height }">
        <div class="bk-sidebar-content-wrapper">
          <div ref="sidebarContent" class="bk-sidebar-content">
            <slot
              :key="isRenderedDetached ? 'detached' : 'attached'"
              :scrolled-to-end="scrolledToEnd"
              :is-detached="isRenderedDetached"
              :width="width"
              :height="height"
            />
          </div>
        </div>
      </template>
    </SidebarDetached>
    <div
      v-else
      v-show="activeSidebar === id"
      class="bk-sidebar-inner"
      @wheel="onWheel"
    >
      <div class="bk">
        <div class="bk-sidebar-title">
          <span>{{ title }}</span>
          <button v-if="!ui.isMobile.value" @click.prevent.stop="onDetach">
            <Icon name="expand" />
          </button>
          <button @click.prevent.stop="toggleSidebar(id)">
            <Icon name="close" />
          </button>
        </div>
      </div>
      <div class="bk-sidebar-content-wrapper">
        <div ref="sidebarContent" class="bk-sidebar-content">
          <slot
            :key="isRenderedDetached ? 'detached' : 'attached'"
            :scrolled-to-end="scrolledToEnd"
            :is-detached="isRenderedDetached"
            :width="undefined"
            :height="undefined"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  watch,
  ref,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon, ShortcutIndicator } from '#blokkli/components'
import SidebarDetached from './Detached/index.vue'
import defineCommands from '#blokkli/helpers/composables/defineCommands'

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    editOnly?: boolean
    icon: BlokkliIcon
    weight?: string | number
    renderAlways?: boolean
    region?: 'left' | 'right'
    minWidth?: number
    minHeight?: number
    size?: { width: number; height: number }
    meta?: boolean
    shift?: boolean
    keyCode?: string
  }>(),
  {
    region: 'right',
    weight: 0,
    minWidth: undefined,
    minHeight: undefined,
    size: undefined,
  },
)

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const { storage, state, ui, eventBus, $t } = useBlokkli()

const detachedKey = computed(() => 'sidebar:detached:' + props.id)
const storageKey = computed(() => 'sidebar:active:' + props.region)
const isDetached = storage.use(detachedKey, false)
const activeSidebar = storage.use(storageKey, '')

const isRenderedDetached = computed(
  () => isDetached.value && !ui.isMobile.value,
)

const onWheel = (e: WheelEvent) => {
  if (isOverflowing.value) {
    e.stopPropagation()
  }
}

const onDetach = () => {
  isDetached.value = true
  activeSidebar.value = ''
  emit('updated')
}

const onAttach = () => {
  isDetached.value = false
  emit('updated')
}

const toggleSidebar = (id: string) => {
  activeSidebar.value === id
    ? (activeSidebar.value = '')
    : (activeSidebar.value = id)
  emit('updated')
}

const showSidebar = () => {
  if (isDetached.value) {
    return
  }
  activeSidebar.value = props.id
}

watch(activeSidebar, (active) => {
  if (active) {
    document.documentElement.classList.add('bk-has-sidebar-' + props.region)
  } else {
    document.documentElement.classList.remove('bk-has-sidebar-' + props.region)
  }
})

const sidebarContent = ref<HTMLDivElement | null>(null)
const scrolledToEnd = ref(false)
const isOverflowing = ref(false)
let raf: any = null

const loop = () => {
  if (sidebarContent.value) {
    scrolledToEnd.value =
      sidebarContent.value.scrollHeight -
        (sidebarContent.value.scrollTop + sidebarContent.value.offsetHeight) <
      3

    isOverflowing.value =
      sidebarContent.value.scrollHeight > sidebarContent.value.offsetHeight
  }
  raf = window.requestAnimationFrame(loop)
}

/**
 * Emitted when an item was dropped onto the page.
 */
const onItemDropped = () => {
  // On mobile we want to close the active sidebar.
  // Some sidebar panes like the media library or clipboard allow drag and drop.
  // During dragging the sidebar is hidden. If dragging ends, the sidebar would
  // be visible again, which is annoying.
  // This is why we hide any sidebar in this case.
  if (ui.isMobile.value && activeSidebar.value) {
    activeSidebar.value = ''
  }
}

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
  return {
    id: 'plugin:sidebar:' + props.id,
    label: commandTitle.value,
    group: 'ui',
    icon: props.icon,
    disabled: isRenderedDetached.value,
    callback: commandCallback,
  }
})

onMounted(() => {
  loop()
  eventBus.on('item:dropped', onItemDropped)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(raf)
  eventBus.off('item:dropped', onItemDropped)
})

defineExpose({ showSidebar })
</script>

<script lang="ts">
export default {
  name: 'PluginSidebar',
}
</script>
