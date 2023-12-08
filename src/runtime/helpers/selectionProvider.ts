import type { DraggableExistingBlokkliItem } from '#blokkli/types'
import { findElement, buildDraggableItem, falsy } from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'
import { Sortable } from '#blokkli/sortable'

export type BlokkliSelectionProvider = {
  /**
   * The currently selected UUIDs.
   */
  uuids: Readonly<globalThis.Ref<string[]>>

  /**
   * The currently selected blocks.
   */
  blocks: globalThis.ComputedRef<DraggableExistingBlokkliItem[]>

  /**
   * The active field key.
   */
  activeFieldKey: Readonly<globalThis.Ref<string>>

  /**
   * Whether the user is currently dragging a block.
   */
  isDragging: Readonly<globalThis.Ref<boolean>>

  /**
   * Update the active field key.
   */
  setActiveFieldKey: (key: string) => void
}

export default function (): BlokkliSelectionProvider {
  const selectedUuids = ref<string[]>([])
  const activeFieldKey = ref('')
  const isDragging = ref(false)

  const blocks = computed<DraggableExistingBlokkliItem[]>(() =>
    selectedUuids.value
      .map((uuid) => {
        const el = findElement(uuid)
        if (el) {
          const item = buildDraggableItem(el)
          if (item?.itemType === 'existing') {
            return item
          }
        }
      })
      .filter(falsy),
  )

  function updateSortable() {
    document.querySelectorAll('.sortable-selected').forEach((el) => {
      Sortable.utils.deselect(el as any)
    })
    selectedUuids.value.forEach((uuid) => {
      const item = findElement(uuid)
      if (item) {
        Sortable.utils.select(item)
      }
    })
  }

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
    updateSortable()
  }

  function unselectItems() {
    selectedUuids.value = []
    updateSortable()
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
    updateSortable()
  }

  function onWindowMouseDown(e: MouseEvent) {
    if (e.ctrlKey) {
      return
    }
    if (e.target && e.target instanceof Element) {
      if (e.target.closest('.bk-blokkli-item-actions')) {
        return
      }
      if (e.target.closest('[data-uuid]')) {
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
    }
    unselectItems()
  }

  const onStateReloaded = () => {
    nextTick(() => {
      selectedUuids.value = selectedUuids.value.filter((uuid) => {
        // Check if the currently selected item is still in the DOM.
        const el = findElement(uuid)
        if (el) {
          return true
        }

        return false
      })
    })
  }

  function onDraggingStart() {
    isDragging.value = true
  }

  function onDraggingEnd() {
    isDragging.value = false
  }

  onMounted(() => {
    document.documentElement.addEventListener('mousedown', onWindowMouseDown)
    eventBus.on('select', onSelect)
    eventBus.on('select:start', unselectItems)
    eventBus.on('select:toggle', selectToggle)
    eventBus.on('select:end', selectItems)
    eventBus.on('setActiveFieldKey', setActiveFieldKey)
    eventBus.on('state:reloaded', onStateReloaded)
    eventBus.on('dragging:start', onDraggingStart)
    eventBus.on('dragging:end', onDraggingEnd)
  })

  onBeforeUnmount(() => {
    document.documentElement.removeEventListener('mousedown', onWindowMouseDown)
    eventBus.off('select', onSelect)
    eventBus.off('select:start', unselectItems)
    eventBus.off('select:toggle', selectToggle)
    eventBus.off('select:end', selectItems)
    eventBus.off('setActiveFieldKey', setActiveFieldKey)
    eventBus.off('state:reloaded', onStateReloaded)
    eventBus.off('dragging:start', onDraggingStart)
    eventBus.off('dragging:end', onDraggingEnd)
  })

  const setActiveFieldKey = (key: string) => (activeFieldKey.value = key)

  return {
    uuids: selectedUuids,
    blocks,
    activeFieldKey,
    isDragging,
    setActiveFieldKey,
  }
}
