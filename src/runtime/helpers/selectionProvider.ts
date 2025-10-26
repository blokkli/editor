import type { DomProvider } from './domProvider'
import onBlokkliEvent from './composables/onBlokkliEvent'
import { type Ref, type ComputedRef, computed, ref } from '#imports'

import type {
  DraggableItem,
  InteractionMode,
  RenderedFieldListItem,
} from '#blokkli/types'
import { falsy, modulo, onlyUnique } from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { BlocksProvider } from './providers/blocks'

export type SelectionProvider = {
  /**
   * The currently selected UUIDs.
   */
  uuids: Readonly<Ref<string[]>>

  /**
   * Whether the host is currently selected.
   */
  hasHostSelected: ComputedRef<boolean>

  /**
   * Whether anything is selected.
   */
  hasAnythingSelected: ComputedRef<boolean>

  /**
   * The selected bundles.
   */
  bundles: ComputedRef<string[]>

  /**
   * The currently selected UUIDs as a Set.
   */
  uuidsSet: ComputedRef<Set<string>>

  /**
   * The currently selected field list items.
   */
  items: ComputedRef<RenderedFieldListItem[]>

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

  isBlockSelected(uuid: string): boolean

  /**
   * Lock selection.
   */
  lockSelection: (key: string) => void

  /**
   * Unlock selection.
   */
  unlockSelection: (key: string) => void
}

export default function (
  dom: DomProvider,
  blocks: BlocksProvider,
): SelectionProvider {
  const selectedUuids = ref<string[]>([])
  const hasHostSelected = ref(false)
  const activeFieldKey = ref('')
  const draggingMode = ref<InteractionMode | null>(null)
  const editableActive = ref(false)
  const isChangingOptions = ref(false)
  const isMultiSelecting = ref(false)
  const interactionMode = ref<InteractionMode>('mouse')
  const selectionLocks = ref<string[]>([])

  const selectedRenderedItems = computed(() => {
    const items: RenderedFieldListItem[] = []
    for (let i = 0; i < selectedUuids.value.length; i++) {
      const uuid = selectedUuids.value[i]
      if (!uuid) {
        continue
      }

      const item = blocks.getBlock(uuid)

      if (!item) {
        continue
      }

      items.push(item)
    }

    return items
  })

  const bundles = computed<string[]>(() => {
    return selectedRenderedItems.value.map((v) => v.bundle).filter(onlyUnique)
  })

  const selectionIsLocked = computed(() => !!selectionLocks.value.length)

  const dragItems = ref<DraggableItem[]>([])
  const dragItemsBundles = computed(() =>
    dragItems.value
      .map((v) => {
        if (v.itemType === 'existing') {
          return v.block.bundle
        } else if ('itemBundle' in v) {
          return v.itemBundle
        }
      })
      .filter(falsy),
  )

  const uuidsSet = computed(() => new Set(selectedUuids.value))

  const isDragging = computed(() => !!draggingMode.value)

  function updateSelectedUuids(uuids: string[], force?: boolean) {
    if (selectionIsLocked.value && !force) {
      return
    }
    selectedUuids.value = uuids
  }

  function unselectItems() {
    activeFieldKey.value = ''
    if (selectedUuids.value.length === 0) {
      return
    }
    updateSelectedUuids([])
  }

  function onSelect(v: string | string[], force?: boolean) {
    if (typeof v === 'string') {
      updateSelectedUuids([v], force)
    } else {
      updateSelectedUuids(v.filter(onlyUnique), force)
    }
  }

  const selectInList = (prev?: boolean) => {
    const items = blocks.getAllBlocks()
    if (!items.length) {
      return
    }

    const currentIndex = selectedRenderedItems.value[0]
      ? items.findIndex((v) => v.uuid === selectedRenderedItems.value[0]!.uuid)
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
  onBlokkliEvent('select:force', (arg) => {
    onSelect(arg, true)
  })
  onBlokkliEvent('select:start', (e) => {
    updateSelectedUuids((e.uuids || []).filter(onlyUnique))
    isMultiSelecting.value = true
    interactionMode.value = e.mode
    activeFieldKey.value = ''
  })
  onBlokkliEvent('select:toggle', (uuid) => {
    if (selectedUuids.value.includes(uuid)) {
      updateSelectedUuids(selectedUuids.value.filter((v) => v !== uuid))
    } else {
      selectedUuids.value.push(uuid)
    }
  })

  onBlokkliEvent('select:end', (uuids) => {
    isMultiSelecting.value = false
    if (!uuids || (uuids.length === 0 && selectedUuids.value.length === 0)) {
      return
    }
    updateSelectedUuids(uuids)
  })

  onBlokkliEvent('select:previous', () => selectInList(true))
  onBlokkliEvent('select:next', selectInList)
  onBlokkliEvent('setActiveFieldKey', setActiveFieldKey)
  onBlokkliEvent('dragging:start', (e) => {
    draggingMode.value = e.mode
    isMultiSelecting.value = false
    dragItems.value = e.items
    const blocks = e.items.filter((v) => v.itemType === 'existing')

    if (blocks.length) {
      updateSelectedUuids(blocks.map((v) => v.block.uuid))
    }
  })
  onBlokkliEvent('dragging:end', () => {
    draggingMode.value = null
  })

  onBlokkliEvent('select:unselect', () => {
    updateSelectedUuids([])
  })

  onBlokkliEvent('select:host', () => {
    hasHostSelected.value = true
  })

  onBlokkliEvent('select:host:unselect', () => {
    hasHostSelected.value = false
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

  const hasAnythingSelected = computed<boolean>(() => {
    return hasHostSelected.value || !!selectedUuids.value.length
  })

  function isBlockSelected(uuid: string) {
    return uuidsSet.value.has(uuid)
  }

  function lockSelection(key: string) {
    selectionLocks.value.push(key)
  }

  function unlockSelection(key: string) {
    selectionLocks.value = selectionLocks.value.filter((v) => v !== key)
  }

  return {
    uuids: selectedUuids,
    bundles,
    items: selectedRenderedItems,
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
    uuidsSet,
    dragItemsBundles,
    isBlockSelected,
    hasHostSelected: computed(() => {
      return hasHostSelected.value && !selectedUuids.value.length
    }),
    hasAnythingSelected,
    lockSelection,
    unlockSelection,
  }
}
