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
      :class="[{ 'bk-is-active': isActive }, 'bk-is-' + listOrientation]"
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
  defineBlokkliFeature,
} from '#imports'
import { Sortli } from '#blokkli/components'
import { PluginSidebar } from '#blokkli/plugins'
import type { AddListOrientation } from '#blokkli/types'

const { settings } = defineBlokkliFeature({
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

const { state, $t, eventBus } = useBlokkli()

const listOrientation = computed<AddListOrientation>(
  () => settings.value.orientation || 'vertical',
)

const isSidebar = computed(() => listOrientation.value === 'sidebar')
const shouldRender = computed(() => state.editMode.value === 'editing')

watch(listOrientation, () => {
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
  if (listOrientation.value === 'horizontal' && e.deltaX) {
    e.stopPropagation()
    return
  }

  if (listOrientation.value === 'vertical' && e.deltaY) {
    e.stopPropagation()
  }
}

function setRootClasses() {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')

  if (!shouldRender.value) {
    return
  }

  if (listOrientation.value === 'horizontal') {
    document.documentElement.classList.add('bk-has-sidebar-bottom')
  } else if (listOrientation.value === 'vertical') {
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
