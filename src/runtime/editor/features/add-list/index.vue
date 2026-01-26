<template>
  <Teleport v-if="shouldRender" :to="ui.mainLayoutElement.value">
    <div
      id="bk-add-list"
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
          :help-active
          @help="activeHelpItem = $event"
          @start-help="onStartHelp"
        />
        <AddListActions
          :selectable-bundles
          :help-active
          :actions
          @help="activeHelpItem = $event"
          @start-help="onStartHelp"
        />
      </div>
      <Transition name="bk-add-list-help" :duration="200">
        <AddListHelpComponent
          v-if="hasOpenedHelpOnce || DEBUG_HELP"
          v-show="helpIsVisible"
          :is-visible="helpIsVisible"
          :type="helpType"
          :id="helpId"
          :element="activeHelpItem?.element"
          :actions
          :bundles="generallyAvailableBundles"
        />
      </Transition>
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
  onBeforeUnmount,
} from '#imports'
import { PluginTourItem } from '#blokkli/editor/plugins'
import AddListBlocks from './Blocks/index.vue'
import AddListActions from './Actions/index.vue'
import AddListHelpComponent from './Help/index.vue'
import { itemEntityType } from '#blokkli-build/config'
import { onlyUnique } from '#blokkli/helpers'
import type { BlockBundleDefinition } from '#blokkli/editor/types/definitions'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
import type { AddListHelp } from './types'
import type { AddAction } from '#blokkli/editor/types/actions'

const DEBUG_HELP = false

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

const { $t, ui, selection, state, tour, types, context, dom, plugins } =
  useBlokkli()

const actions = computed<AddAction[]>(() => {
  return plugins.get('addAction').sort((a, b) => a.weight - b.weight)
})

const helpActive = ref(false)
const hasOpenedHelpOnce = ref(false)

const activeHelpItem = ref<AddListHelp | null>(null)

const helpType = computed(() =>
  DEBUG_HELP ? 'bundle' : activeHelpItem.value?.type,
)
const helpId = computed(() =>
  DEBUG_HELP ? 'two_columns' : activeHelpItem.value?.id,
)
const helpIsVisible = computed(
  () => (isActive.value && helpActive.value) || DEBUG_HELP,
)

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
let mouseTimeout: number | null = null
let mouseLeaveTimeout: number | null = null

const isActive = computed(() => {
  return (
    (isHovered.value || hasContextMenuOpen.value || tour.isTouring.value) &&
    !selection.isDragging.value
  )
})

function onStartHelp(item: AddListHelp) {
  helpActive.value = true
  hasOpenedHelpOnce.value = true
  activeHelpItem.value = item
}

function onMouseEnter() {
  if (mouseLeaveTimeout) {
    window.clearTimeout(mouseLeaveTimeout)
    mouseLeaveTimeout = null
  }

  if (mouseTimeout) {
    window.clearTimeout(mouseTimeout)
    mouseTimeout = null
  }

  mouseTimeout = window.setTimeout(() => {
    isHovered.value = true
    mouseTimeout = null
  }, 300)
}
function onMouseLeave() {
  if (mouseTimeout) {
    window.clearTimeout(mouseTimeout)
    mouseTimeout = null
  }
  if (mouseLeaveTimeout) {
    window.clearTimeout(mouseLeaveTimeout)
    mouseLeaveTimeout = null
  }
  if (helpActive.value) {
    mouseLeaveTimeout = window.setTimeout(() => {
      isHovered.value = false
      helpActive.value = false
    }, 300)
  } else {
    isHovered.value = false
    helpActive.value = false
  }
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

onBeforeUnmount(() => {
  if (mouseTimeout) {
    window.clearTimeout(mouseTimeout)
  }
})
</script>

<script lang="ts">
export default {
  name: 'AddList',
}
</script>
