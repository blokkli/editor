<template>
  <PluginSidebar
    v-if="isSidebar && shouldRender"
    id="add_list"
    :title="sidebarTitle"
    :tour-text="tourText"
    render-always
    icon="plus"
    weight="-10"
    @updated="eventBus.emit('add-list:change')"
  >
    <div>
      <div id="blokkli-add-list-sidebar-before" />
      <Sortli class="bk bk-list-sidebar">
        <div id="blokkli-add-list-blocks" />
        <div id="blokkli-add-list-actions" />
      </Sortli>
    </div>
  </PluginSidebar>
  <Teleport v-else-if="shouldRender" to="body">
    <div
      ref="wrapper"
      class="bk bk-add-list bk-control"
      :class="[
        { 'bk-is-active': isActive || hasContextMenuOpen },
        'bk-is-' + ui.addListOrientation.value,
      ]"
      :style="style"
      @wheel.capture.passive="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <Sortli class="bk-list">
        <div id="blokkli-add-list-blocks" />
        <div id="blokkli-add-list-actions" />
      </Sortli>
    </div>
    <PluginTourItem
      id="add-blocks"
      selector=".bk-list"
      :title="sidebarTitle"
      :text="tourText"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  computed,
  useBlokkli,
  nextTick,
  defineBlokkliFeature,
} from '#imports'
import { Sortli } from '#blokkli/components'
import { PluginSidebar, PluginTourItem } from '#blokkli/plugins'
import { addElementClasses } from '#blokkli/helpers/addElementClasses'

const { settings } = defineBlokkliFeature({
  id: 'add-list',
  icon: 'plus',
  label: 'Add List',
  description:
    'Provides the container to render a list of blocks to add or add actions.',
  settings: {
    orientation: {
      type: 'radios',
      label: 'Add List',
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

  screenshot: 'feature-add-list.jpg',
})

const { state, $t, eventBus, ui } = useBlokkli()

const hasContextMenuOpen = computed(() =>
  ui.openContextMenu.value.startsWith('add_list_item_'),
)

const isSidebar = computed(() => ui.addListOrientation.value === 'sidebar')
const shouldRender = computed(() => state.editMode.value === 'editing')

watch(ui.addListOrientation, () => {
  nextTick(() => {
    eventBus.emit('add-list:change')
  })
})

const CLASS_LEFT = 'bk-has-add-list-left'
const CLASS_BOTTOM = 'bk-has-add-list-bottom'

const wrapper = ref<HTMLDivElement | null>(null)
const isActive = ref(false)
let mouseTimeout: any = null

const style = computed(() => {
  if (
    settings.value.orientation === 'vertical' &&
    (isActive.value || hasContextMenuOpen.value) &&
    wrapper.value
  ) {
    const labels = [
      ...wrapper.value.querySelectorAll('.bk-list-item-label span'),
    ] as HTMLSpanElement[]

    // Determine which label has the largest width.
    const width = labels.reduce((acc, el) => {
      if (el.offsetWidth > acc) {
        return el.offsetWidth
      }
      return acc
    }, 0)
    return {
      '--bk-add-list-width': width + 90,
    }
  }

  return undefined
})

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
  if (e.ctrlKey || e.metaKey) {
    return
  }
  if (ui.addListOrientation.value === 'horizontal' && e.deltaX) {
    e.stopPropagation()
    return
  }

  if (ui.addListOrientation.value === 'vertical' && e.deltaY) {
    e.stopPropagation()
  }
}

const sidebarTitle = computed(() => $t('addListSidebarTitle', 'Add blocks'))

const tourText = computed(() =>
  $t(
    'addListTourText',
    '<p>This shows the list of available blocks that can be placed. Add a block by dragging the icon into the page.</p><p>When an existing block is selected, some blocks may be greyed out. This indicates which blocks can be placed inside or after the selected block.</p>',
  ),
)

addElementClasses(
  document.documentElement,
  CLASS_BOTTOM,
  computed(() => ui.addListOrientation.value === 'horizontal'),
)
addElementClasses(
  document.documentElement,
  CLASS_LEFT,
  computed(() => ui.addListOrientation.value === 'vertical'),
)
</script>

<script lang="ts">
export default {
  name: 'AddList',
}
</script>
