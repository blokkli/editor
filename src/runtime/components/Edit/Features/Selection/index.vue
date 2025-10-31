<template>
  <Overlay
    v-if="isVisible"
    :blocks="selection.items.value"
    :uuids="selection.uuids.value"
    :has-host-selected="selection.hasHostSelected.value"
  />
  <PluginItemDropdown
    v-if="itemDropdownItems.length"
    id="selection"
    :title="$t('selectionActionGroupTitle', 'Selection')"
    :enabled="itemDropdownEnabled"
    :items="itemDropdownItems"
    icon="selection"
    weight="200"
    @select="onSelectDropdownItem"
  />

  <SelectionAddButtons
    v-if="state.editMode.value === 'editing'"
    :items="selection.items.value"
  />
</template>

<script lang="ts" setup>
import Overlay from './Overlay/index.vue'
import SelectionAddButtons from './AddButtons/index.vue'
import {
  calculateIntersection,
  getBounds,
  intersects,
  modulo,
  originatesFromTextInput,
} from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import useStateBasedCache from '#blokkli/helpers/composables/useStateBasedCache'
import { PluginItemDropdown } from '#blokkli/plugins'
import type { Rectangle, RenderedFieldListItem } from '#blokkli/types'
import {
  computed,
  useBlokkli,
  defineBlokkliFeature,
  ref,
  watch,
} from '#imports'
import { itemEntityType } from '#blokkli-build/config'

defineBlokkliFeature({
  id: 'selection',
  icon: 'selection',
  label: 'Selection',
  description: 'Renders an overlay that highlights the selected blocks.',
})

type DropdownItem = {
  id: 'select-all-of-bundle' | 'select-all-blocks'
  label: string
}

const {
  selection,
  ui,
  eventBus,
  animation,
  dom,
  tour,
  $t,
  types,
  state,
  blocks,
  element,
} = useBlokkli()

const getSelectionOrder = useStateBasedCache(() => {
  return element.queryAll(
    ui.artboardElement(),
    '[data-uuid]',
    'getSelectionOrder',
    (el) => el.dataset.uuid,
  )
})

const selectedBundle = computed<string | null>(() => {
  if (selection.bundles.value.length === 1) {
    return selection.bundles.value[0] ?? null
  }

  return null
})

const itemDropdownEnabled = computed(() => true)

const itemDropdownItems = computed<DropdownItem[]>(() => {
  if (selectedBundle.value) {
    const label =
      types.getBlockBundleDefinition(selectedBundle.value)?.label ??
      selectedBundle.value
    return [
      {
        id: 'select-all-of-bundle',
        label: $t('selectAllOfBundle', 'Select all "@bundle" blocks').replace(
          '@bundle',
          label,
        ),
      },
    ]
  } else if (selection.hasHostSelected.value) {
    return [
      {
        id: 'select-all-blocks',
        label: $t('selectAllBlocks', 'Select all blocks'),
      },
    ]
  }
  return []
})

function onSelectDropdownItem(item: DropdownItem) {
  if (item.id === 'select-all-of-bundle') {
    if (selectedBundle.value) {
      const uuids = state.getAllUuids(selectedBundle.value)
      eventBus.emit('select', uuids)
    }
  } else if (item.id === 'select-all-blocks') {
    selectAllBlocks()
  }
}

const hasSelectedOnce = ref(false)

const stop = watch(
  selection.hasAnythingSelected,
  function (hasAnythingSelected) {
    if (hasAnythingSelected) {
      hasSelectedOnce.value = true
    }
    stop()
  },
)

const isVisible = computed(
  () =>
    dom.isReady.value &&
    !selection.isMultiSelecting.value &&
    !selection.editableActive.value &&
    !selection.isChangingOptions.value &&
    !selection.isDragging.value &&
    !ui.isAnimating.value &&
    hasSelectedOnce.value,
)

/**
 * Find the block that is most visible for the user.
 *
 * Most visible is determined by how much of the block intersects with the
 * padded visible viewport area.
 */
const findMostVisibleBlock = (): string | null => {
  const viewport = ui.visibleViewportPadded.value
  const uuids = dom.getVisibleBlocks()

  let maxIntersection = 0
  let maxY = 9999
  let mostVisibleUuid: string | null = null

  for (let i = 0; i < uuids.length; i++) {
    const uuid = uuids[i]!
    const absoluteRect = dom.getBlockRect(uuid)
    if (!absoluteRect) {
      continue
    }

    const rect = ui.getViewportRelativeRect(absoluteRect)

    // The intersection as a value from 0 to 1.
    const intersection = calculateIntersection(rect, viewport)
    if (
      intersection &&
      intersection > maxIntersection &&
      rect.y < maxY &&
      rect.y > 0
    ) {
      mostVisibleUuid = uuid
      maxIntersection = intersection
      maxY = rect.y
    }
  }

  return mostVisibleUuid
}

const getSelectAllUuids = (
  allBlocks: RenderedFieldListItem[],
  currentlySelected: RenderedFieldListItem[],
): string[] => {
  // One or more blocks are selected.
  if (currentlySelected.length >= 1) {
    const selectedHostUuids = currentlySelected.map((block) => block.host.uuid)
    const selectedHostTypes = currentlySelected.map((block) => block.host.type)
    const selectedHostFieldNames = currentlySelected.map(
      (block) => block.host.fieldName,
    )
    const selectedUuids = currentlySelected.map((v) => v.uuid)

    const commonHostUuids = selectedHostUuids.filter(
      (uuid, index, self) => self.indexOf(uuid) === index,
    )
    const commonHostTypes = selectedHostTypes.filter(
      (type, index, self) => self.indexOf(type) === index,
    )
    const commonHostFieldNames = selectedHostFieldNames.filter(
      (fieldName, index, self) => self.indexOf(fieldName) === index,
    )

    // Find all blocks that share the same host.
    const newUuids = allBlocks
      .filter(
        (block) =>
          commonHostUuids.includes(block.host.uuid) &&
          commonHostTypes.includes(block.host.type) &&
          commonHostFieldNames.includes(block.host.fieldName),
      )
      .map((block) => block.uuid)

    const isSame = newUuids.every((uuid) => selectedUuids.includes(uuid))

    if (!isSame) {
      return newUuids
    }
  }

  return allBlocks
    .filter((block) => block.host.type !== itemEntityType)
    .map((block) => block.uuid)
}

/**
 * Determine which blocks to select when the user is clicking on a block with the shift key.
 */
const visuallySelectBlocks = (toggleUuid: string): string[] | undefined => {
  const rects = dom.getBlockRects()
  const allUuids = Object.keys(rects)
  const selected = selection.uuids.value
  // Nothing selected yet, so we select the new block.
  if (selected.length === 0) {
    return [toggleUuid]
  }

  const singleSelectedBlock =
    selected.length === 1 ? blocks.getBlock(selected[0]!) : null

  const toggleRect = rects[toggleUuid]
  if (!toggleRect) {
    return
  }
  const toggleBlock = blocks.getBlock(toggleUuid)
  if (!toggleBlock) {
    return
  }
  const filter = (encompassingRect: Rectangle): string[] => {
    const candidates: string[] = []
    for (let i = 0; i < allUuids.length; i++) {
      const uuid = allUuids[i]!
      const rect = rects[uuid]
      if (!rect) {
        continue
      }

      if (!intersects(rect, encompassingRect)) {
        continue
      }

      const block = blocks.getBlock(uuid)

      if (!block) {
        continue
      }

      if (
        block.isNested === toggleBlock.isNested ||
        singleSelectedBlock?.isNested === block.isNested
      ) {
        candidates.push(uuid)
      }
    }

    return candidates
  }
  const isToggleSelected = selected.includes(toggleUuid)

  // One block selected.
  if (selected.length === 1) {
    if (isToggleSelected) {
      return []
    }

    const selectedUuid = selected[0]!
    const selectedRect = rects[selectedUuid]
    if (!selectedRect) {
      return
    }
    const encompassingRect = getBounds([selectedRect, toggleRect])
    if (!encompassingRect) {
      return
    }

    return filter(encompassingRect)
  }

  // More than one selected.
  // Find the most upper left element excluding the toggleElement.
  const upperLeftUuid = selected
    .filter((uuid) => (isToggleSelected ? uuid !== toggleUuid : true))
    .reduce((prev, current) => {
      const prevRect = rects[prev]
      const currentRect = rects[current]
      return currentRect &&
        prevRect &&
        prevRect.x <= currentRect.x &&
        prevRect.y <= currentRect.y
        ? prev
        : current
    })

  const upperLeftRect = rects[upperLeftUuid]
  if (!upperLeftRect) {
    return
  }
  const encompassingRect = getBounds([upperLeftRect, toggleRect])
  if (!encompassingRect) {
    return
  }

  return filter(encompassingRect)
}

function selectAllBlocks() {
  eventBus.emit(
    'select:end',
    getSelectAllUuids(blocks.getAllBlocks(), selection.items.value),
  )
}

onBlokkliEvent('select:shiftToggle', (uuid) => {
  const uuids = visuallySelectBlocks(uuid)
  if (uuids) {
    eventBus.emit('select', uuids)
  }
})

function selectBlock(uuid: string) {
  eventBus.emit('select', uuid)
  dom.refreshBlockRect(uuid)
  eventBus.emit('scrollIntoView', { uuid })
}

/**
 * Find the next or previous block.
 */
function selectInList(prev?: boolean) {
  const currentUuid = selection.uuids.value[selection.uuids.value.length - 1]
  if (!currentUuid) {
    return
  }

  const selectionOrder = getSelectionOrder()
  const currentIndex = selectionOrder.indexOf(currentUuid)
  const delta = prev ? -1 : 1
  const newIndex = modulo(currentIndex + delta, selectionOrder.length)
  const newUuid = selectionOrder[newIndex]
  if (newUuid) {
    selectBlock(newUuid)
  }
}

onBlokkliEvent('keyPressed', (e) => {
  if (
    selection.isDragging.value ||
    selection.isMultiSelecting.value ||
    ui.hasDialogOpen.value ||
    ui.hasTooltipOpen.value
  ) {
    return
  }
  if (e.code === 'Escape') {
    if (!ui.openTooltip.value) {
      eventBus.emit('select:end', [])
      eventBus.emit('select:host:unselect')
    }
  } else if (e.code === 'Tab') {
    if (tour.isTouring.value || ui.hasDialogOpen.value) {
      return
    }
    e.originalEvent.preventDefault()

    // No block is selected.
    if (!selection.items.value.length) {
      // Select the most visible block for the user.
      const uuid = findMostVisibleBlock()
      if (uuid) {
        eventBus.emit('select', uuid)
        eventBus.emit('scrollIntoView', { uuid })
      }
      return
    }

    if (e.shift) {
      selectInList(true)
    } else {
      selectInList()
    }
    animation.requestDraw()
  } else if (e.code === 'a' && e.meta) {
    // Regular native CTRL+A behaviour should not be overriden.
    if (originatesFromTextInput(e.originalEvent)) {
      return
    }
    e.originalEvent.preventDefault()
    selectAllBlocks()
  }
})
</script>

<script lang="ts">
export default {
  name: 'Selection',
}
</script>
