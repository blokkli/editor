<template>
  <Teleport v-if="!isDetached" to="#bk-sidebar-tabs">
    <button
      :class="{ 'is-active': activeSidebar === id }"
      :disabled="editOnly && !state.canEdit.value"
      :style="{ order: weight || 0 }"
      @click.prevent.stop="toggleSidebar(id)"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        {{ title }}
      </div>
    </button>
  </Teleport>

  <Teleport
    v-if="activeSidebar === id || isRenderedDetached || renderAlways"
    :to="isRenderedDetached ? 'body' : '#bk-sidebar-content'"
  >
    <SidebarDetached
      @wheel="onWheel"
      v-if="isRenderedDetached"
      :id="id"
      :title="title"
      :icon="icon"
      class="bk-sidebar-inner"
      @close="onAttach"
    >
      <template #icon>
        <slot name="icon" />
      </template>
      <div class="bk-sidebar-content-wrapper">
        <div ref="sidebarContent" class="bk-sidebar-content">
          <slot :scrolled-to-end="scrolledToEnd" />
        </div>
      </div>
    </SidebarDetached>
    <div
      v-else
      class="bk-sidebar-inner"
      @wheel="onWheel"
      v-show="activeSidebar === id"
    >
      <div class="bk">
        <div class="bk-sidebar-title">
          <span>{{ title }}</span>
          <button @click.prevent.stop="onDetach">
            <Icon name="expand" />
          </button>
        </div>
      </div>
      <div class="bk-sidebar-content-wrapper">
        <div ref="sidebarContent" class="bk-sidebar-content">
          <slot :scrolled-to-end="scrolledToEnd" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, ref, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'
import SidebarDetached from './Detached/index.vue'

const props = defineProps<{
  id: string
  title: string
  editOnly?: boolean
  icon?: BlokkliIcon
  weight?: string
  renderAlways?: boolean
}>()

const { storage, state, ui } = useBlokkli()

const detachedKey = computed(() => 'sidebar:detached:' + props.id)

const isDetached = storage.use(detachedKey, false)
const activeSidebar = storage.use('sidebar:active', '')

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
}

const onAttach = () => {
  isDetached.value = false
  activeSidebar.value = props.id
}

const toggleSidebar = (id: string) =>
  activeSidebar.value === id
    ? (activeSidebar.value = '')
    : (activeSidebar.value = id)

const showSidebar = () => (activeSidebar.value = props.id)

watch(activeSidebar, (active) => {
  if (active) {
    document.documentElement.classList.add('bk-has-sidebar-right')
  } else {
    document.documentElement.classList.remove('bk-has-sidebar-right')
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

onMounted(() => {
  loop()
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(raf)
})

defineExpose({ showSidebar })
</script>

<script lang="ts">
export default {
  name: 'PluginSidebar',
}
</script>
