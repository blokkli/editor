import { DraggableExistingParagraphItem } from '#pb/types'
import { findParagraphElement, buildDraggableItem, falsy } from '#pb/helpers'
import { eventBus } from '../eventBus'
import { Sortable } from '#pb/sortable'

export default function (isPressingSpace: globalThis.Ref<boolean>) {
  const selectedParagraphUuids = ref<string[]>([])
  const activeFieldKey = ref('')

  const selectedParagraphs = computed<DraggableExistingParagraphItem[]>(() =>
    selectedParagraphUuids.value
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
    selectedParagraphUuids.value = paragraphs.map((v) => v.uuid)
  }

  function onMultiSelectStart() {
    selectedParagraphUuids.value = []
  }

  function unselectParagraphs() {
    selectedParagraphUuids.value = []
    document.querySelectorAll('.sortable-selected').forEach((el) => {
      Sortable.utils.deselect(el as any)
    })
  }

  function onSelectParagraph(uuid: string) {
    unselectParagraphs()
    selectedParagraphUuids.value = [uuid]
  }

  function onSelectParagraphAdditional(item: DraggableExistingParagraphItem) {
    if (selectedParagraphUuids.value.includes(item.uuid)) {
      selectedParagraphUuids.value = selectedParagraphUuids.value.filter(
        (uuid) => uuid !== item.uuid,
      )
      return
    }
    selectedParagraphUuids.value.push(item.uuid)
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

  onMounted(() => {
    document.body.addEventListener('mousedown', onWindowMouseDown)
    eventBus.on('selectAdditional', onSelectParagraphAdditional)
    eventBus.on('select', onSelectParagraph)
    eventBus.on('select:start', onMultiSelectStart)
    eventBus.on('select:end', onSelectEnd)
  })

  onBeforeUnmount(() => {
    document.body.removeEventListener('mousedown', onWindowMouseDown)
    eventBus.off('selectAdditional', onSelectParagraphAdditional)
    eventBus.off('select', onSelectParagraph)
    eventBus.off('select:start', onMultiSelectStart)
    eventBus.off('select:end', onSelectEnd)
  })

  return {
    selectedParagraphUuids,
    selectedParagraphs,
    activeFieldKey,
  }
}
