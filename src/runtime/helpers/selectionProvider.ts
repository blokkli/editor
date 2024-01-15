import {
  type Ref,
  type ComputedRef,
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
} from 'vue'

import type {
  DraggableExistingBlock,
  DraggableStartEvent,
  DraggingMode,
} from '#blokkli/types'
import {
  findElement,
  buildDraggableItem,
  falsy,
  modulo,
  intersects,
  getBounds,
} from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { DomProvider } from './domProvider'
import type { StateProvider } from './stateProvider'

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

  const blocks = computed<DraggableExistingBlock[]>(() =>
    selectedUuids.value
      .map((uuid) => {
        const el = findElement(uuid)
        if (el && state.refreshKey.value) {
          const item = buildDraggableItem(el)
          if (item?.itemType === 'existing') {
            return item
          }
        }
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

  function selectToggle(uuid: string) {
    if (selectedUuids.value.includes(uuid)) {
      selectedUuids.value = selectedUuids.value.filter((v) => v !== uuid)
    } else {
      selectedUuids.value.push(uuid)
    }
  }

  function onWindowMouseDown(e: MouseEvent) {
    if (e.ctrlKey) {
      return
    }
    if (e.target && e.target instanceof Element) {
      if (e.target.closest('.bk-blokkli-item-actions')) {
        return
      }
      if (e.target.closest('.bk-list')) {
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

  const onStateReloaded = () => {
    selectedUuids.value = selectedUuids.value.filter((uuid) => {
      // Check if the currently selected item is still in the DOM.
      const el = findElement(uuid)
      if (el) {
        return true
      }

      return false
    })
  }

  function onDraggingStart(e: DraggableStartEvent) {
    draggingMode.value = e.mode
    isMultiSelecting.value = false
  }

  function onDraggingEnd() {
    draggingMode.value = null
  }

  const onSelectStart = (uuids: string[] = []) => {
    selectedUuids.value = uuids
    isMultiSelecting.value = true
  }

  const onSelectEnd = (uuids: string[] = []) => {
    isMultiSelecting.value = false
    if (uuids.length === 0 && selectedUuids.value.length === 0) {
      return
    }
    selectItems(uuids)
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

  const onShiftToggle = (uuid: string) => {
    const block = dom.findBlock(uuid)
    if (!block) {
      return
    }
    selectedUuids.value = visuallySelectBlocks(
      dom.getAllBlocks(),
      blocks.value,
      block,
    )
  }

  const onSelectPrevious = () => selectInList(true)
  const onSelectNext = () => selectInList()

  onMounted(() => {
    document.documentElement.addEventListener('mousedown', onWindowMouseDown)
    eventBus.on('select', onSelect)
    eventBus.on('select:start', onSelectStart)
    eventBus.on('select:toggle', selectToggle)
    eventBus.on('select:shiftToggle', onShiftToggle)
    eventBus.on('select:end', onSelectEnd)
    eventBus.on('select:previous', onSelectPrevious)
    eventBus.on('select:next', onSelectNext)
    eventBus.on('setActiveFieldKey', setActiveFieldKey)
    eventBus.on('state:reloaded', onStateReloaded)
    eventBus.on('dragging:start', onDraggingStart)
    eventBus.on('dragging:end', onDraggingEnd)
  })

  onBeforeUnmount(() => {
    document.documentElement.removeEventListener('mousedown', onWindowMouseDown)
    eventBus.off('select', onSelect)
    eventBus.off('select:start', onSelectStart)
    eventBus.off('select:toggle', selectToggle)
    eventBus.off('select:shiftToggle', onShiftToggle)
    eventBus.off('select:end', onSelectEnd)
    eventBus.off('select:previous', onSelectPrevious)
    eventBus.off('select:next', onSelectNext)
    eventBus.off('setActiveFieldKey', setActiveFieldKey)
    eventBus.off('state:reloaded', onStateReloaded)
    eventBus.off('dragging:start', onDraggingStart)
    eventBus.off('dragging:end', onDraggingEnd)
  })

  const setActiveFieldKey = (key: string) => (activeFieldKey.value = key)

  watch(isMultiSelecting, (is) => {
    is
      ? document.body.classList.add('bk-is-selecting')
      : document.body.classList.remove('bk-is-selecting')
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
