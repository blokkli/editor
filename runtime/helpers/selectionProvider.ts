import { DraggableExistingParagraphItem } from '#pb/types'
import { findParagraphElement, buildDraggableItem, falsy } from '#pb/helpers'
import { eventBus } from '../eventBus'
import { Sortable } from '#pb/sortable'

export type PbSelectionProvider = {
  uuids: Readonly<Ref<string[]>>
  blocks: ComputedRef<DraggableExistingParagraphItem[]>
  activeFieldKey: Readonly<Ref<string>>
  isDragging: Readonly<Ref<boolean>>
  setActiveFieldKey: (key: string) => void
}

export default function (
  isPressingSpace: globalThis.Ref<boolean>,
): PbSelectionProvider {
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

  function onSelectEnd(uuids: string[]) {
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
  }

  function onMultiSelectStart() {
    selectedUuids.value = []
  }

  function unselectParagraphs() {
    selectedUuids.value = []
    document.querySelectorAll('.sortable-selected').forEach((el) => {
      Sortable.utils.deselect(el as any)
    })
  }

  function onSelectParagraph(uuid: string) {
    unselectParagraphs()
    selectedUuids.value = [uuid]
  }

  function onSelectParagraphAdditional(item: DraggableExistingParagraphItem) {
    if (selectedUuids.value.includes(item.uuid)) {
      selectedUuids.value = selectedUuids.value.filter(
        (uuid) => uuid !== item.uuid,
      )
      return
    }
    selectedUuids.value.push(item.uuid)
  }

  function onWindowMouseDown(e: MouseEvent) {
    if (e.ctrlKey || isPressingSpace.value) {
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
    document.body.addEventListener('mousedown', onWindowMouseDown)
    eventBus.on('selectAdditional', onSelectParagraphAdditional)
    eventBus.on('select', onSelectParagraph)
    eventBus.on('select:start', onMultiSelectStart)
    eventBus.on('select:end', onSelectEnd)
    eventBus.on('setActiveFieldKey', setActiveFieldKey)
    eventBus.on('state:reloaded', onStateReloaded)
    eventBus.on('draggingStart', onDraggingStart)
    eventBus.on('draggingEnd', onDraggingEnd)
  })

  onBeforeUnmount(() => {
    document.body.removeEventListener('mousedown', onWindowMouseDown)
    eventBus.off('selectAdditional', onSelectParagraphAdditional)
    eventBus.off('select', onSelectParagraph)
    eventBus.off('select:start', onMultiSelectStart)
    eventBus.off('select:end', onSelectEnd)
    eventBus.off('setActiveFieldKey', setActiveFieldKey)
    eventBus.off('state:reloaded', onStateReloaded)
    eventBus.off('draggingStart', onDraggingStart)
    eventBus.off('draggingEnd', onDraggingEnd)
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
