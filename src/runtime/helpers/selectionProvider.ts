import type { DomProvider } from './domProvider'
import onBlokkliEvent from './composables/onBlokkliEvent'
import { type Ref, type ComputedRef, computed, ref } from '#imports'

import type {
  DraggableExistingBlock,
  DraggableItem,
  InteractionMode,
} from '#blokkli/types'
import {
  findElement,
  buildDraggableItem,
  falsy,
  modulo,
  onlyUnique,
} from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'

export type SelectionProvider = {
  /**
   * The currently selected UUIDs.
   */
  uuids: Readonly<Ref<string[]>>

  /**
   * The currently selected UUIDs as a map.
   */
  uuidsMap: ComputedRef<Record<string, boolean>>

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
   * Whether the user is currently dragging at least one existing block.
   */
  isDraggingExisting: ComputedRef<boolean>

  /**
   * Whether the user is currently dragging a block.
   */
  draggingMode: Readonly<Ref<InteractionMode | null>>

  /**
   * Whether the user is currently dragging a block.
   */
  interactionMode: Readonly<Ref<InteractionMode | null>>

  /**
   * Whether the user is currently in multi select mode.
   */
  isMultiSelecting: Ref<boolean>

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

  /**
   * The items that are currently being dragged.
   */
  dragItems: Ref<DraggableItem[]>

  /**
   * The block bundles of the items being dragged.
   */
  dragItemsBundles: ComputedRef<string[]>
}

export default function (dom: DomProvider): SelectionProvider {
  const selectedUuids = ref<string[]>([])
  const activeFieldKey = ref('')
  const draggingMode = ref<InteractionMode | null>(null)
  const editableActive = ref(false)
  const isChangingOptions = ref(false)
  const isMultiSelecting = ref(false)
  const interactionMode = ref<InteractionMode>('mouse')

  const dragItems = ref<DraggableItem[]>([])
  const dragItemsBundles = computed(() =>
    dragItems.value.map((v) => v.itemBundle).filter(falsy),
  )

  const uuidsMap = computed(() => {
    return selectedUuids.value.reduce<Record<string, boolean>>((acc, uuid) => {
      acc[uuid] = true
      return acc
    }, {})
  })

  const isDragging = computed(() => !!draggingMode.value)

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
    activeFieldKey.value = ''
    if (selectedUuids.value.length === 0) {
      return
    }
    selectedUuids.value = []
  }

  function onSelect(v: string | string[]) {
    if (typeof v === 'string') {
      selectItems([v])
    } else {
      selectItems(v.filter(onlyUnique))
    }
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
    dom.refreshBlockRect(targetItem.uuid)
    eventBus.emit('scrollIntoView', { uuid: targetItem.uuid })
  }

  const setActiveFieldKey = (key: string) => (activeFieldKey.value = key)

  onBlokkliEvent('select', onSelect)
  onBlokkliEvent('select:start', (e) => {
    selectedUuids.value = (e.uuids || []).filter(onlyUnique)
    isMultiSelecting.value = true
    interactionMode.value = e.mode
    activeFieldKey.value = ''
  })
  onBlokkliEvent('select:toggle', (uuid) => {
    if (selectedUuids.value.includes(uuid)) {
      selectedUuids.value = selectedUuids.value.filter((v) => v !== uuid)
    } else {
      selectedUuids.value.push(uuid)
    }
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
    // selectedUuids.value = selectedUuids.value.filter((uuid) => {
    //   // Check if the currently selected item is still in the DOM.
    //   const el = findElement(uuid)
    //   if (el) {
    //     return true
    //   }
    //
    //   return false
    // })
  })
  onBlokkliEvent('dragging:start', (e) => {
    draggingMode.value = e.mode
    isMultiSelecting.value = false
    dragItems.value = e.items
    const blocks = e.items.filter(
      (v) => v.itemType === 'existing',
    ) as DraggableExistingBlock[]

    if (blocks.length) {
      selectItems(blocks.map((v) => v.uuid))
    }
  })
  onBlokkliEvent('dragging:end', () => {
    draggingMode.value = null
  })

  onBlokkliEvent('window:clickAway', () => {
    unselectItems()
    activeFieldKey.value = ''
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })

  const isDraggingExisting = computed(() => {
    return (
      isDragging.value &&
      !!dragItems.value.length &&
      dragItems.value.some(
        (v) => v.itemType === 'existing' || v.itemType === 'existing_structure',
      )
    )
  })

  return {
    uuids: selectedUuids,
    blocks,
    activeFieldKey,
    isDragging,
    isDraggingExisting,
    setActiveFieldKey,
    editableActive,
    isChangingOptions,
    isMultiSelecting,
    draggingMode,
    interactionMode,
    dragItems,
    uuidsMap,
    dragItemsBundles,
  }
}
