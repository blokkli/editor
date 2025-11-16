<template>
  <Teleport v-if="!isRenderedDetached" :to="'#bk-sidebar-tabs-' + region">
    <button
      :id="'bk-sidebar-button-' + id"
      ref="tourElement"
      class="bk-toolbar-button"
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
      <div class="bk-tooltip">
        <span>{{ title }}</span>
        <ShortcutIndicator
          v-if="keyCode"
          :meta
          :shift
          :key-code
          :label="title"
          @pressed="toggleSidebar"
        />
      </div>
    </button>
  </Teleport>

  <Teleport
    v-if="
      (activeSidebar === id || isRenderedDetached || renderAlways) &&
      !isDisabled
    "
    :to="isRenderedDetached ? 'body' : '#bk-sidebar-content-' + region"
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
          <div v-if="beta" class="bk-beta-indicator">BETA</div>
          <button v-if="!ui.isMobile.value" @click.prevent.stop="onDetach">
            <Icon name="dock-window" />
          </button>
          <button @click.prevent.stop="toggleSidebar">
            <Icon name="close" />
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
} from '#blokkli/components'
import SidebarDetached from './Detached/index.vue'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import useAnimationFrame from '#blokkli/helpers/composables/useAnimationFrame'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'
import type { SidebarRegion } from '#blokkli/types'

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    tourText?: string
    editOnly?: boolean
    icon: BlokkliIcon
    weight?: string | number
    renderAlways?: boolean
    disabled?: boolean
    region?: SidebarRegion
    minWidth?: number
    minHeight?: number
    size?: { width: number; height: number }
    meta?: boolean
    shift?: boolean
    keyCode?: string
    beta?: boolean
    isLoading?: boolean
  }>(),
  {
    region: 'right',
    tourText: undefined,
    weight: 0,
    minWidth: undefined,
    minHeight: undefined,
    size: undefined,
    keyCode: undefined,
  },
)

const emit = defineEmits<{
  (e: 'updated'): void
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
  if (id === props.id) {
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
