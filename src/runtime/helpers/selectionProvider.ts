import {
  type Ref,
  type ComputedRef,
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from '#imports'

import type { DraggableExistingBlock, DraggingMode } from '#blokkli/types'
import {
  findElement,
  buildDraggableItem,
  falsy,
  modulo,
  intersects,
  getBounds,
  originatesFromEditable,
} from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { DomProvider } from './domProvider'
import type { RenderedBlock, StateProvider } from './stateProvider'
import onBlokkliEvent from './composables/onBlokkliEvent'

/**
 * Find the longest common subsequence between two arrays.
 */
const findLCS = (a: string[], b: string[]): string[] => {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  )

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  let i = a.length,
    j = b.length
  const lcs: string[] = []
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  return lcs
}

/**
 * Determine which blocks should be selected when the state changes.
 */
const getSelectedAfterStateChange = (
  selected: string[],
  newBlocks: RenderedBlock[],
  oldBlocks: RenderedBlock[],
): string[] | undefined => {
  const newUuids = newBlocks.map((v) => v.item.uuid)
  const oldUuids = oldBlocks.map((v) => v.item.uuid)

  // A new block was addded. Select this one.
  const newBlock = newUuids.find((uuid) => !oldUuids.includes(uuid))
  if (newBlock) {
    return [newBlock]
  }

  // All block UUIDs that still exist.
  const stillExisting = selected.filter((uuid) =>
    newUuids.find((v) => v === uuid),
  )

  // Some currently selected blocks still exist, so let's keep that selection.
  if (stillExisting.length) {
    return stillExisting
  }

  // Same amount of blocks before and after, so blocks were likely moved.
  if (newBlocks.length === oldBlocks.length) {
    const lcs = findLCS(oldUuids, newUuids)
    const toSelect = newUuids.filter((el) => !lcs.includes(el))
    if (toSelect.length) {
      return toSelect
    }
  }

  // No blocks exist anymore.
  if (stillExisting.length === 0) {
    // Only one block was selected.
    if (selected.length === 1) {
      const index = oldBlocks.findIndex((v) => v.item.uuid === selected[0])
      if (index !== -1) {
        const previousUuid = oldBlocks[index - 1]?.item.uuid
        if (previousUuid) {
          return [previousUuid]
        }
      }
    }
  }
}

/**
 * Determine which blocks to select when the user is clicking on a block with the shift key.
 */
const visuallySelectBlocks = (
  all: DraggableExistingBlock[],
  selected: DraggableExistingBlock[],
  toggleBlock: DraggableExistingBlock,
): string[] => {
  // Nothing selected yet, so we select the new block.
  if (selected.length === 0) {
    return [toggleBlock.uuid]
  }

  const toggleRect = toggleBlock.element().getBoundingClientRect()
  const isToggleSelected = selected.some((el) => el.uuid === toggleBlock.uuid)

  // One block selected.
  if (selected.length === 1) {
    if (isToggleSelected) {
      return []
    }

    const selectedRect = selected[0].element().getBoundingClientRect()
    const encompassingRect = getBounds([selectedRect, toggleRect])!

    return all
      .filter(
        (el) =>
          el.isNested === toggleBlock.isNested ||
          selected[0].isNested === el.isNested,
      )
      .filter((el) =>
        intersects(el.element().getBoundingClientRect(), encompassingRect),
      )
      .map((el) => el.uuid)
  }

  // More than one selected.
  if (isToggleSelected) {
    // Find the most upper left element excluding the toggleElement.
    const upperLeftElement = selected
      .filter((el) => el.uuid !== toggleBlock.uuid)
      .reduce((prev, current) => {
        const prevRect = prev.element().getBoundingClientRect()
        const currentRect = current.element().getBoundingClientRect()
        return prevRect.x <= currentRect.x && prevRect.y <= currentRect.y
          ? prev
          : current
      })

    const upperLeftRect = upperLeftElement.element().getBoundingClientRect()
    const encompassingRect = getBounds([upperLeftRect, toggleRect])!

    return all
      .filter(
        (el) =>
          el.isNested === toggleBlock.isNested ||
          selected.some((sel) => sel.isNested === el.isNested),
      )
      .filter((el) =>
        intersects(el.element().getBoundingClientRect(), encompassingRect),
      )
      .map((el) => el.uuid)
  }

  // toggleBlock is not in the selection, select blocks that are visually
  // between the most upper left block and toggleBlock.
  const upperLeftElement = selected.reduce((prev, current) => {
    const prevRect = prev.element().getBoundingClientRect()
    const currentRect = current.element().getBoundingClientRect()
    return prevRect.x <= currentRect.x && prevRect.y <= currentRect.y
      ? prev
      : current
  })

  const upperLeftRect = upperLeftElement.element().getBoundingClientRect()
  const encompassingRect = getBounds([upperLeftRect, toggleRect])!

  return all
    .filter(
      (el) =>
        el.isNested === toggleBlock.isNested ||
        selected.some((sel) => sel.isNested === el.isNested),
    )
    .filter((el) =>
      intersects(el.element().getBoundingClientRect(), encompassingRect),
    )
    .map((el) => el.uuid)
}

export type SelectionProvider = {
  /**
   * The currently selected UUIDs.
   */
  uuids: Readonly<Ref<string[]>>

  /**
   * The currently selected blocks.
   */
  blocks: ComputedRef<DraggableExistingBlock[]>

  /**
   * The active field key.
   */
  activeFieldKey: Readonly<Ref<string>>

  /**
   * Whether the user is currently dragging a block.
   */
  isDragging: ComputedRef<boolean>

  /**
   * Whether the user is currently dragging a block.
   */
  draggingMode: Readonly<Ref<DraggingMode | null>>

  /**
   * Whether the user is currently in multi select mode.
   */
  isMultiSelecting: Readonly<Ref<boolean>>

  /**
   * Update the active field key.
   */
  setActiveFieldKey: (key: string) => void

  /**
   * Whether an editable field is currently being edited.
   */
  editableActive: Ref<boolean>

  /**
   * Whether the user is currently changing block options.
   */
  isChangingOptions: Ref<boolean>
}

export default function (
  dom: DomProvider,
  state: StateProvider,
): SelectionProvider {
  const selectedUuids = ref<string[]>([])
  const activeFieldKey = ref('')
  const draggingMode = ref<DraggingMode | null>(null)
  const editableActive = ref(false)
  const isChangingOptions = ref(false)
  const isMultiSelecting = ref(false)

  const isDragging = computed(() => !!draggingMode.value)

  watch(state.renderedBlocks, (newBlocks, prevBlocks) => {
    const result = getSelectedAfterStateChange(
      selectedUuids.value,
      newBlocks,
      prevBlocks,
    )

    if (result && result.length) {
      selectedUuids.value = result
      if (selectedUuids.value.length) {
        nextTick(() => {
          eventBus.emit('scrollIntoView', {
            uuid: result[0],
          })
        })
      }
    }
  })

  const blocks = computed<DraggableExistingBlock[]>(() =>
    selectedUuids.value
      .map((uuid) => {
        return dom.findBlock(uuid)
      })
      .filter(falsy),
  )

  function selectItems(uuids: string[]) {
    unselectItems()
    const items = uuids
      .map((uuid) => {
        const element = findElement(uuid)
        if (element) {
          const item = buildDraggableItem(element)
          if (item && item.itemType === 'existing') {
            return item
          }
        }
      })
      .filter(falsy)
    selectedUuids.value = items.map((v) => v.uuid)
  }

  function unselectItems() {
    if (selectedUuids.value.length === 0) {
      return
    }
    selectedUuids.value = []
  }

  function onSelect(uuid: string) {
    selectItems([uuid])
  }

  const onDoubleClick = (e: MouseEvent) => {
    const element = originatesFromEditable(e)
    if (!element) {
      return
    }
    const fieldName = element.dataset.blokkliEditableField
    if (!fieldName) {
      return
    }

    eventBus.emit('editable:focus', {
      fieldName,
      element,
    })
  }

  function onWindowMouseDown(e: MouseEvent) {
    if (e.ctrlKey) {
      return
    }
    eventBus.emit('window:clickAway')
    if (e.target && e.target instanceof Element) {
      if (e.target.closest('.bk-blokkli-item-actions')) {
        return
      }
      if (e.target.closest('.bk-control')) {
        return
      }

      const closestField = e.target.closest('[data-field-key]')
      if (closestField && closestField instanceof HTMLElement) {
        activeFieldKey.value = closestField.dataset.fieldKey || ''
      } else {
        activeFieldKey.value = ''
      }
      if (editableActive.value) {
        eventBus.emit('editable:save')
      }
    }
    unselectItems()
  }

  const selectInList = (prev?: boolean) => {
    const items = dom.getAllBlocks()
    if (!items.length) {
      return
    }

    const currentIndex = blocks.value[0]
      ? items.findIndex((v) => v.uuid === blocks.value[0].uuid)
      : -1

    const targetIndex = modulo(
      prev ? currentIndex - 1 : currentIndex + 1,
      items.length,
    )
    const targetItem = items[targetIndex]
    if (!targetItem) {
      return
    }
    onSelect(targetItem.uuid)
    eventBus.emit('scrollIntoView', { uuid: targetItem.uuid })
  }

  const setActiveFieldKey = (key: string) => (activeFieldKey.value = key)

  watch(isMultiSelecting, (is) => {
    is
      ? document.body.classList.add('bk-is-selecting')
      : document.body.classList.remove('bk-is-selecting')
  })

  onBlokkliEvent('select', onSelect)
  onBlokkliEvent('select:start', (uuids) => {
    selectedUuids.value = uuids || []
    isMultiSelecting.value = true
  })
  onBlokkliEvent('select:toggle', (uuid) => {
    if (selectedUuids.value.includes(uuid)) {
      selectedUuids.value = selectedUuids.value.filter((v) => v !== uuid)
    } else {
      selectedUuids.value.push(uuid)
    }
  })
  onBlokkliEvent('select:shiftToggle', (uuid) => {
    const block = dom.findBlock(uuid)
    if (!block) {
      return
    }
    selectedUuids.value = visuallySelectBlocks(
      dom.getAllBlocks(),
      blocks.value,
      block,
    )
  })
  onBlokkliEvent('select:end', (uuids) => {
    isMultiSelecting.value = false
    if (!uuids || (uuids.length === 0 && selectedUuids.value.length === 0)) {
      return
    }
    selectItems(uuids)
  })
  onBlokkliEvent('select:previous', () => selectInList(true))
  onBlokkliEvent('select:next', selectInList)
  onBlokkliEvent('setActiveFieldKey', setActiveFieldKey)
  onBlokkliEvent('state:reloaded', () => {
    selectedUuids.value = selectedUuids.value.filter((uuid) => {
      // Check if the currently selected item is still in the DOM.
      const el = findElement(uuid)
      if (el) {
        return true
      }

      return false
    })
  })
  onBlokkliEvent('dragging:start', (e) => {
    draggingMode.value = e.mode
    isMultiSelecting.value = false
  })
  onBlokkliEvent('dragging:end', () => {
    draggingMode.value = null
  })

  onMounted(() => {
    document.documentElement.addEventListener('mousedown', onWindowMouseDown)
    document.documentElement.addEventListener('dblclick', onDoubleClick)
  })

  onBeforeUnmount(() => {
    document.documentElement.removeEventListener('mousedown', onWindowMouseDown)
    document.documentElement.removeEventListener('dblclick', onDoubleClick)
  })

  return {
    uuids: selectedUuids,
    blocks,
    activeFieldKey,
    isDragging,
    setActiveFieldKey,
    editableActive,
    isChangingOptions,
    isMultiSelecting,
    draggingMode,
  }
}
