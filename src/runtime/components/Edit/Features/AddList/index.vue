<template>
  <Teleport v-if="shouldRender" :to="ui.mainLayoutElement.value">
    <div
      ref="wrapper"
      class="bk bk-add-list bk-control"
      @wheel.capture.passive="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <div
        class="bk-add-list-inner"
        :class="{
          'bk-is-active': isActive,
        }"
      >
        <AddListBlocks />
        <Sortli id="blokkli-add-list-actions" :build-item="buildItemAction" />
      </div>
    </div>
    <PluginTourItem
      id="add-blocks"
      :element="wrapper"
      :title="sidebarTitle"
      :text="tourText"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { Sortli } from '#blokkli/components'
import { PluginTourItem } from '#blokkli/plugins'
import type { DraggableActionItem } from '#blokkli/types'
import AddListBlocks from './Blocks/index.vue'

defineBlokkliFeature({
  id: 'add-list',
  icon: 'plus',
  label: 'Add List',
  description:
    'Provides the container to render a list of blocks to add or add actions.',
  settings: {
    hideDisabledBlocks: {
      type: 'checkbox',
      label: "Hide blocks that can't be added",
      description: `Hides blocks from the "Add List" if they can't be added to anywhere.`,
      group: 'appearance',
      default: false,
    },
  },

  screenshot: 'feature-add-list.jpg',
})

function buildItemAction(
  element: HTMLElement,
): DraggableActionItem | undefined {
  const actionType = element.dataset.sortliId
  if (!actionType) {
    return
  }
  const itemBundle = element.dataset.itemBundle
  return {
    itemType: 'action',
    actionType,
    itemBundle,
    element: () => element,
  }
}

const { $t, ui, selection, state, tour } = useBlokkli()

const shouldRender = computed(
  () => state.canEdit.value && state.editMode.value === 'editing',
)

const hasContextMenuOpen = computed(() =>
  ui.openContextMenu.value.startsWith('add_list_item_'),
)

const wrapper = ref<HTMLDivElement | null>(null)
const isHovered = ref(false)
const DEBUG = false
let mouseTimeout: any = null

const isActive = computed(() => {
  return (
    (isHovered.value ||
      hasContextMenuOpen.value ||
      DEBUG ||
      tour.isTouring.value) &&
    !selection.isDragging.value
  )
})

function onMouseEnter() {
  clearTimeout(mouseTimeout)
  mouseTimeout = setTimeout(() => {
    isHovered.value = true
  }, 200)
}
function onMouseLeave() {
  clearTimeout(mouseTimeout)
  isHovered.value = false
}

const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    return
  }
  e.stopPropagation()
}

const sidebarTitle = computed(() => $t('addListSidebarTitle', 'Add blocks'))

const tourText = computed(() =>
  $t(
    'addListTourText',
    '<p>This shows the list of available blocks that can be placed. Add a block by dragging the icon into the page.</p><p>When an existing block is selected, some blocks may be greyed out. This indicates which blocks can be placed inside or after the selected block.</p>',
  ),
)
</script>

<script lang="ts">
export default {
  name: 'AddList',
}
</script>
