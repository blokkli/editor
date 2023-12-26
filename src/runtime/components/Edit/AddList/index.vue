<template>
  <PluginSidebar
    v-if="isSidebar"
    id="add_list"
    :title="text('addListSidebarTitle')"
    render-always
    icon="plus"
    weight="-10"
    @updated="eventBus.emit('add-list:change')"
  >
    <div>
      <div id="blokkli-add-list-sidebar-before" />
      <Sortli ref="typeList" class="bk bk-list-sidebar">
        <div id="blokkli-add-list-blocks"></div>
        <div id="blokkli-add-list-actions"></div>
      </Sortli>
    </div>
  </PluginSidebar>
  <Teleport
    v-else-if="state.canEdit.value && state.editMode.value === 'editing'"
    to="body"
  >
    <div
      ref="wrapper"
      class="bk bk-add-list bk-control"
      :class="[
        { 'bk-is-active': isActive },
        'bk-is-' + ui.addListOrientation.value,
      ]"
      @wheel.capture="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <Sortli ref="typeList" class="bk-list">
        <div id="blokkli-add-list-blocks"></div>
        <div id="blokkli-add-list-actions"></div>
      </Sortli>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  computed,
  useBlokkli,
  onMounted,
  onUnmounted,
  nextTick,
} from '#imports'
import { Sortli } from '#blokkli/components'
import { PluginSidebar } from '#blokkli/plugins'

const { state, ui, text, eventBus } = useBlokkli()

const isSidebar = computed(() => ui.addListOrientation.value === 'sidebar')

watch(ui.addListOrientation, () => {
  setRootClasses()
  nextTick(() => {
    eventBus.emit('add-list:change')
  })
})

const typeList = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const isActive = ref(false)
let mouseTimeout: any = null

function onMouseEnter() {
  clearTimeout(mouseTimeout)
  mouseTimeout = setTimeout(() => {
    isActive.value = true
  }, 200)
}
function onMouseLeave() {
  clearTimeout(mouseTimeout)
  isActive.value = false
}

const onWheel = (e: WheelEvent) => {
  if (ui.addListOrientation.value === 'horizontal' && e.deltaX) {
    e.stopPropagation()
    return
  }

  if (ui.addListOrientation.value === 'vertical' && e.deltaY) {
    e.stopPropagation()
  }
}

function setRootClasses() {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')

  if (ui.addListOrientation.value === 'horizontal') {
    document.documentElement.classList.add('bk-has-sidebar-bottom')
  } else if (ui.addListOrientation.value === 'vertical') {
    document.documentElement.classList.add('bk-has-sidebar-left')
  }
}

onMounted(() => {
  setRootClasses()
})
onUnmounted(() => {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')
})
</script>

<script lang="ts">
export default {
  name: 'AddList',
}
</script>
