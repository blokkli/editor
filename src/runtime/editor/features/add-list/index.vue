<template>
  <Teleport v-if="shouldRender" :to="ui.mainLayoutElement.value">
    <div
      v-show="!ui.isApproving.value"
      id="bk-add-list"
      ref="wrapper"
      class="bk bk-add-list bk-control"
      @wheel.capture.passive="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @mousemove="onMouseMove"
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
          @help="onHelp"
          @start-help="onStartHelp"
        />
        <AddListActions
          :selectable-bundles
          :help-active
          :actions
          @help="onHelp"
          @start-help="onStartHelp"
        />
      </div>
      <Transition name="bk-add-list-help" :duration="200">
        <AddListHelpComponent
          v-if="hasOpenedHelpOnce || DEBUG_HELP"
          v-show="helpIsVisible"
          :id="helpId"
          :is-visible="helpIsVisible"
          :type="helpType"
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
import type { BlokkliDefinitionAddBehaviour } from './../../../../global/types/definitions'
import { defineDropHandler } from '#blokkli/editor/composables'

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

const {
  $t,
  ui,
  selection,
  state,
  tour,
  types,
  context,
  dom,
  plugins,
  adapter,
  definitions,
  fields,
  eventBus,
} = useBlokkli()

// new: add new block.
defineDropHandler('new', {
  async execute({ items, host, afterUuid, bundle }) {
    const itemBundle = bundle || items[0]!.itemBundle
    const field = fields.find(host.uuid, host.fieldName)
    if (!field) {
      throw new Error(
        `Failed to locate field with name "${host.fieldName}" on UUID "${host.uuid}"`,
      )
    }
    const definition = definitions.getBlockDefinition(
      itemBundle,
      field.fieldListType,
      field.hostEntityBundle as any,
    )
    const addBehaviour: BlokkliDefinitionAddBehaviour =
      definition?.editor?.addBehaviour || 'form'
    if (
      definition?.editor?.disableEdit ||
      addBehaviour === 'no-form' ||
      addBehaviour.startsWith('editable:') ||
      addBehaviour.startsWith('complex-option:') ||
      !adapter.formFrameBuilder
    ) {
      await state.mutateWithLoadingState(() =>
        adapter.addNewBlock({
          bundle: itemBundle,
          host,
          afterUuid,
        }),
      )
      return { focusEditable: true }
    } else {
      eventBus.emit('add:block:new', {
        bundle: itemBundle,
        host,
        afterUuid,
      })
    }
  },
})

// action: call action callback.
defineDropHandler('action', {
  execute({ items, host, field, afterUuid }) {
    items[0]!.action.callback({
      preceedingUuid: afterUuid,
      host,
      field,
    })
  },
})

const actions = computed<AddAction[]>(() => {
  return plugins.get('addAction').sort((a, b) => a.weight - b.weight)
})

const helpActive = ref(false)
const hasOpenedHelpOnce = ref(false)

const activeHelpItem = ref<AddListHelp | null>(null)

const helpType = computed(() =>
  DEBUG_HELP ? 'bundle' : activeHelpItem.value?.type,
)
const helpId = computed(() => (DEBUG_HELP ? 'image' : activeHelpItem.value?.id))
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

// Hover intent state for help popup
const ANGLE_THRESHOLD = (35 * Math.PI) / 180 // 45° in radians

let lastMouseX = 0
let lastMouseY = 0
let pendingHelpItem: AddListHelp | null = null
let isMovingTowardsPopup = false

function clearPendingHelp() {
  pendingHelpItem = null
}

function onMouseMove(e: MouseEvent) {
  const dx = e.clientX - lastMouseX
  const dy = e.clientY - lastMouseY

  // Only calculate direction if there's meaningful movement
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    // Angle from vertical: 0 = vertical, π/2 = horizontal
    const angle = Math.abs(Math.atan2(Math.abs(dx), Math.abs(dy)))
    isMovingTowardsPopup = angle >= ANGLE_THRESHOLD && dx > 0

    // If moving vertically and we have a pending item, activate it
    if (!isMovingTowardsPopup && pendingHelpItem) {
      activeHelpItem.value = pendingHelpItem
      pendingHelpItem = null
    }
  }

  lastMouseX = e.clientX
  lastMouseY = e.clientY
}

function onHelp(item: AddListHelp) {
  // If moving towards popup (horizontally right), defer activation
  if (isMovingTowardsPopup) {
    pendingHelpItem = item
  } else {
    // Moving vertically or no recent movement - activate immediately
    pendingHelpItem = null
    activeHelpItem.value = item
  }
}

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
  clearPendingHelp()
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
  clearPendingHelp()
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

<style lang="postcss">
.bk.bk-add-list {
  @apply pointer-events-auto relative z-add-list bg-mono-900;
  @apply w-toolbar-left h-full relative;

  grid-area: left;

  .bk-add-item {
    @apply cursor-grab;
  }

  .bk-add-item-description {
    @apply block;
    @apply absolute left-full;
  }

  #blokkli-add-list-blocks {
    @apply grid pb-25;
  }

  #blokkli-add-list-actions {
    @apply grid;
    @apply sticky bottom-0 bg-mono-800 border-t border-t-mono-700 z-50;
    @apply mt-auto;

    .bk-add-item-label {
      @apply text-mono-400;

      .bk-icon {
        @apply bg-mono-900;
      }
    }

    .bk-item-icon {
      --bk-item-icon-shadow-color: theme('colors.mono.900');
    }

    &:after {
      content: '';
      @apply block w-full h-40 sticky bottom-0 z-50 pointer-events-none;
      @apply absolute bottom-full left-0 mb-1;
      background: linear-gradient(
        theme('colors.mono.900/0') 30%,
        theme('colors.mono.900')
      );
    }
  }
}

.bk-add-item-label {
  @apply flex items-center flex-1 gap-8 pr-25;
}

.bk-add-item-description {
  @apply hidden;
}

.bk-add-list-inner {
  @apply absolute top-0 left-0 h-full overflow-auto transition-all ease-swing duration-200 w-auto;
  @apply bg-mono-900;
  @apply flex flex-col;
  @apply border-t border-t-mono-700;
  clip-path: rect(0px var(--bk-toolbar-left-width) 100% 0px);

  .bk-add-item-label {
    @apply opacity-0;
  }

  .bk-add-item:not(:last-child) {
    margin-bottom: calc(var(--bk-add-item-icon-padding) * -1);
  }

  &.bk-is-active {
    clip-path: rect(0px 100% 100% 0px);
  }

  &::-webkit-scrollbar {
    display: none;
  }
}

.bk-add-list-inner,
.bk-dragging-overlay {
  .bk-add-item-icon {
    @apply size-toolbar-left;
    padding: var(--bk-add-item-icon-padding);
  }
}

.bk-add-list-inner.bk-is-active,
.bk-dragging-overlay {
  .bk-add-item-label {
    @apply !opacity-100;
  }
}

.bk-add-item:hover,
.bk-dragging-overlay {
  .bk-add-item {
    @apply !opacity-100;
  }
  .bk-add-item-label {
    @apply !text-white;
  }
}

.bk {
  .bk-add-item {
    @apply bg-mono-900 relative overflow-hidden;
    @apply flex whitespace-nowrap items-center w-full min-w-fit;

    &.bk-is-action {
      @apply bg-mono-800;
    }

    &.bk-is-disabled {
      @apply opacity-30;
      &:hover {
        @apply opacity-100;
      }
    }
  }

  .bk-add-item-label {
    @apply font-semibold pl-3  text-mono-400 transition-opacity duration-200;
    font-size: var(--bk-add-item-font-size, 18px);
  }

  .bk-add-item-icon {
    @apply shrink-0 relative z-50;
  }
}

.bk-item-icon-hover-parent:hover,
.bk-add-item:hover,
.bk-add-item:focus-visible,
.bk-dragging-overlay {
  .bk-item-icon {
    @apply outline outline-white/40;
    outline-width: var(--bk-item-icon-outline);
    outline-offset: calc(var(--bk-item-icon-outline) * -1);

    svg {
      @apply !opacity-100;
    }
  }
}

.bk-dragging-overlay .bk-add-item {
  @apply rounded-lg overflow-hidden;
}

.bk .bk-item-icon {
  --bk-item-icon-outline: 2px;
  --bk-item-icon-size: calc(
    var(--bk-toolbar-left-width) - 2 * (var(--bk-add-item-icon-padding, 0px))
  );
  --bk-item-icon-radius-base: var(--bk-item-icon-radius-base-toolbar, 8px);
  --bk-item-icon-radius-multiplier: 1;
  --bk-item-icon-shadow-color: theme('colors.mono.950');
  @apply aspect-square flex items-center justify-center;
  @apply border bg-gradient-to-b bg-black;
  width: var(--bk-item-icon-size);
  height: var(--bk-item-icon-size);
  box-shadow: 0 2px 3px 1px var(--bk-item-icon-shadow-color);
  border-radius: calc(
    var(--bk-item-icon-radius-base) * var(--bk-item-icon-radius-multiplier)
  );

  @supports (corner-shape: squircle) {
    corner-shape: squircle;
    --bk-item-icon-radius-multiplier: 2.25;
  }

  &.bk-is-small {
    --bk-item-icon-outline: 1px;
    --bk-item-icon-size: 35px;
    --bk-item-icon-radius-base: 6px;
    box-shadow: 0 1px 1px 1px var(--bk-item-icon-shadow-color);

    svg {
      filter: drop-shadow(0px -1px 0px var(--bk-item-icon-shadow-color));
    }
  }

  &.bk-is-tiny {
    --bk-item-icon-outline: 1px;
    --bk-item-icon-size: 25px;
    --bk-item-icon-radius-base: 5px;
    box-shadow: 0 1px 1px 1px var(--bk-item-icon-shadow-color);

    svg {
      filter: drop-shadow(0px -1px 0px var(--bk-item-icon-shadow-color));
    }
  }

  > .bk-blokkli-item-icon,
  > .bk-icon {
    @apply size-[66.6666666%];
  }

  --bk-item-icon-shadow-color: theme('colors.mono.950');

  svg {
    @apply size-full fill-current opacity-80;
    filter: drop-shadow(0px -1px 0px var(--bk-item-icon-shadow-color));
  }

  &.bk-is-default {
    @apply border-mono-100/40 text-mono-100;
    @apply from-mono-800;
    @apply to-mono-600;
  }

  &.bk-is-yellow {
    --bk-item-icon-shadow-color: rgba(0, 0, 0, 0.2);
    @apply border-yellow-normal/50 text-yellow-light;
    @apply from-yellow-normal/25;
    @apply to-yellow-normal/40;
  }

  &.bk-is-rose {
    --bk-item-icon-shadow-color: rgba(0, 0, 0, 0.2);
    @apply border-red-normal text-red-light;
    @apply from-red-normal/50;
    @apply to-red-normal/70;
  }

  &.bk-is-lime {
    --bk-item-icon-shadow-color: rgba(0, 0, 0, 0.2);
    @apply border-lime-normal text-lime-light;
    @apply from-lime-normal/50;
    @apply to-lime-normal/70;
  }

  &.bk-is-accent {
    --bk-item-icon-shadow-color: theme('colors.accent.900');
    @apply border-accent-400 text-accent-50;
    @apply from-accent-800;
    @apply to-accent-600;
  }

  &.bk-is-orange {
    --bk-item-icon-shadow-color: rgba(0, 0, 0, 0.2);
    @apply border-orange-normal text-orange-light;
    @apply from-orange-normal/50;
    @apply to-orange-normal/70;
  }
}
</style>
