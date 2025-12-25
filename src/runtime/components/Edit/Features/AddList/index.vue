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
        <AddListBlocks
          :selectable-bundles
          :generally-available-bundles
          :hide-disabled-blocks="settings.hideDisabledBlocks"
        />
        <AddListActions :selectable-bundles />
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
import {
  ref,
  computed,
  useBlokkli,
  defineBlokkliFeature,
  useTemplateRef,
} from '#imports'
import { PluginTourItem } from '#blokkli/plugins'
import AddListBlocks from './Blocks/index.vue'
import AddListActions from './Actions/index.vue'
import type {
  BlockBundleDefinition,
  RenderedFieldListItem,
} from '#blokkli/types'
import { itemEntityType } from '#blokkli-build/config'
import { onlyUnique } from '#blokkli/helpers'

const { settings } = defineBlokkliFeature({
  id: 'add-list',
  icon: 'bk_mdi_add',
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

const { $t, ui, selection, state, tour, types, context, dom } = useBlokkli()

const getAllowedTypesForSelected = (p: RenderedFieldListItem): string[] => {
  // If the selected bundle allows nested items, return the allowed bundles for it instead.
  if (types.itemBundlesWithNested.includes(p.bundle)) {
    return types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, p.bundle)
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  }
  // If the selected bundle is inside a nested item, return the allowed bundles of the parent bundle.
  if (p.host.type === itemEntityType) {
    return types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, p.host.bundle)
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  } else {
    return (
      types.getFieldConfig(
        context.value.entityType,
        context.value.entityBundle,
        p.host.fieldName,
      )?.allowedBundles || []
    )
  }
}

// All allowed bundles for which a field is being rendered currently.
// Some blocks may have nested blocks, however they may not render them via
// a <BlokkliField>. This would make it so that these nested block bundles
// show up in the add list, but there is no place where these could be added.
const bundlesForRenderedFields = computed(() => {
  return dom.registeredFieldTypes.value
    .flatMap((field) => {
      return (
        types.getFieldConfig(
          field.entityType,
          field.entityBundle,
          field.fieldName,
        )?.allowedBundles || []
      )
    })
    .filter(onlyUnique)
})

const generallyAvailableBundles = computed<BlockBundleDefinition[]>(() =>
  types.generallyAvailableBundles.filter((v) =>
    // Exclude bundles for which no field is currently being rendered.
    bundlesForRenderedFields.value.includes(v.id),
  ),
)

const selectableBundles = computed(() => {
  if (selection.items.value.length) {
    return selection.items.value.flatMap((v) => getAllowedTypesForSelected(v))
  }

  return generallyAvailableBundles.value.map((v) => v.id || '')
})

const shouldRender = computed(
  () => state.canEdit.value && state.editMode.value === 'editing',
)

const hasContextMenuOpen = computed(() =>
  ui.openContextMenu.value.startsWith('add_list_item_add-list-blocks'),
)

const wrapper = useTemplateRef('wrapper')
const isHovered = ref(false)
let mouseTimeout: any = null

const isActive = computed(() => {
  return (
    (isHovered.value || hasContextMenuOpen.value || tour.isTouring.value) &&
    !selection.isDragging.value
  )
})

function onMouseEnter() {
  if (mouseTimeout) {
    clearTimeout(mouseTimeout)
    isHovered.value = true
    mouseTimeout = null
    return
  }
  mouseTimeout = setTimeout(() => {
    isHovered.value = true
    mouseTimeout = null
  }, 300)
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
