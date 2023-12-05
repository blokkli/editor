import { DraggableExistingParagraphItem } from '#blokkli/types'
import { findParagraphElement, buildDraggableItem, falsy } from '#blokkli/helpers'
import { eventBus } from '../eventBus'
import { Sortable } from '#blokkli/sortable'

export type PbSelectionProvider = {
  /**
   * The currently selected UUIDs.
   */
  uuids: Readonly<Ref<string[]>>

  /**
   * The currently selected blocks.
   */
  blocks: ComputedRef<DraggableExistingParagraphItem[]>

  /**
   * The active field key.
   */
  activeFieldKey: Readonly<Ref<string>>

  /**
   * Whether the user is currently dragging a block.
   */
  isDragging: Readonly<Ref<boolean>>

  /**
   * Update the active field key.
   */
  setActiveFieldKey: (key: string) => void
}

export default function (): PbSelectionProvider {
  const selectedUuids = ref<string[]>([])
  const activeFieldKey = ref('')
  const isDragging = ref(false)

  const blocks = computed<DraggableExistingParagraphItem[]>(() =>
    selectedUuids.value
      .map((uuid) => {
        const el = findParagraphElement(uuid)
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
      const item = findParagraphElement(uuid)
      if (item) {
        Sortable.utils.select(item)
      }
    })
  }

  function selectParagraphs(uuids: string[]) {
    unselectParagraphs()
    const paragraphs = uuids
      .map((uuid) => {
        const element = findParagraphElement(uuid)
        if (element) {
          const item = buildDraggableItem(element)
          if (item && item.itemType === 'existing') {
            return item
          }
        }
      })
      .filter(falsy)
    selectedUuids.value = paragraphs.map((v) => v.uuid)
    updateSortable()
  }

  function unselectParagraphs() {
    selectedUuids.value = []
    updateSortable()
  }

  function onSelectParagraph(uuid: string) {
    selectParagraphs([uuid])
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
      if (e.target.closest('.pb-paragraph-actions')) {
        return
      }
      if (e.target.closest('[data-uuid]')) {
        return
      }
      if (e.target.closest('.pb-list')) {
        return
      }
      if (e.target.closest('.pb-control')) {
        return
      }

      const closestField = e.target.closest('[data-field-key]')
      if (closestField && closestField instanceof HTMLElement) {
        activeFieldKey.value = closestField.dataset.fieldKey || ''
      } else {
        activeFieldKey.value = ''
      }
    }
    unselectParagraphs()
  }

  const onStateReloaded = () => {
    nextTick(() => {
      selectedUuids.value = selectedUuids.value.filter((uuid) => {
        // Check if the currently selected paragraph is still in the DOM.
        const el = findParagraphElement(uuid)
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
    eventBus.on('select', onSelectParagraph)
    eventBus.on('select:start', unselectParagraphs)
    eventBus.on('select:toggle', selectToggle)
    eventBus.on('select:end', selectParagraphs)
    eventBus.on('setActiveFieldKey', setActiveFieldKey)
    eventBus.on('state:reloaded', onStateReloaded)
    eventBus.on('dragging:start', onDraggingStart)
    eventBus.on('dragging:end', onDraggingEnd)
  })

  onBeforeUnmount(() => {
    document.documentElement.removeEventListener('mousedown', onWindowMouseDown)
    eventBus.off('select', onSelectParagraph)
    eventBus.off('select:start', unselectParagraphs)
    eventBus.off('select:toggle', selectToggle)
    eventBus.off('select:end', selectParagraphs)
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
