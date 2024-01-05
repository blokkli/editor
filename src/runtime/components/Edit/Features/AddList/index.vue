<template>
  <PluginSidebar
    v-if="isSidebar && shouldRender"
    id="add_list"
    :title="$t('addListSidebarTitle')"
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
  <Teleport v-else-if="shouldRender" to="body">
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
  onBeforeUnmount,
  nextTick,
  defineBlokkliFeature,
} from '#imports'
import { Sortli } from '#blokkli/components'
import { PluginSidebar } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'add-list',
  icon: 'plus',
  label: 'Add List',
  description:
    'Provides the container to render a list of blocks to add or add actions.',
  settings: {
    orientation: {
      type: 'radios',
      label: 'Add List Orientation',
      default: 'vertical',
      group: 'appearance',
      viewports: ['desktop'],
      options: {
        vertical: {
          label: 'Vertical',
          icon: 'ui-list-vertical',
        },
        horizontal: {
          label: 'Horizontal',
          icon: 'ui-list-horizontal',
        },
        sidebar: {
          label: 'Sidebar',
          icon: 'ui-list-sidebar',
        },
      },
    },
  },
})

const { state, $t, eventBus, ui } = useBlokkli()

const isSidebar = computed(() => ui.addListOrientation.value === 'sidebar')
const shouldRender = computed(() => state.editMode.value === 'editing')

watch(ui.addListOrientation, () => {
  setRootClasses()
  nextTick(() => {
    eventBus.emit('add-list:change')
  })
})
watch(shouldRender, () => {
  setRootClasses()
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
  document.documentElement.classList.remove('bk-has-add-list-bottom')
  document.documentElement.classList.remove('bk-has-add-list-left')

  if (!shouldRender.value) {
    return
  }

  if (ui.addListOrientation.value === 'horizontal') {
    document.documentElement.classList.add('bk-has-add-list-bottom')
  } else if (ui.addListOrientation.value === 'vertical') {
    document.documentElement.classList.add('bk-has-add-list-left')
  }
}

onMounted(() => {
  setRootClasses()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('bk-has-add-list-bottom')
  document.documentElement.classList.remove('bk-has-add-list-left')
})
</script>

<script lang="ts">
export default {
  name: 'AddList',
}
</script>
