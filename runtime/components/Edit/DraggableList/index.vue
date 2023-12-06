<template>
  <component
    ref="container"
    class="bk-paragraphs-container"
    :class="{ 'is-empty': !listToUse.length }"
    :is="tag || 'div'"
    @click.capture="onClick"
    @dblclick.capture="onDoubleClick"
    :data-field-name="fieldConfig.name"
    :data-field-label="fieldConfig.label"
    :data-field-is-nested="isNested"
    :data-host-entity-type="entity.entityTypeId"
    :data-host-entity-uuid="entity.uuid"
    :data-field-key="fieldKey"
  >
    <BlokkliItem
      v-for="(item, i) in listToUse"
      :item="item.item"
      :paragraph="item.paragraph"
      :is-editing="true"
      :index="i"
      :key="
        'i_' +
        item.item?.uuid +
        entity.uuid +
        entity.entityTypeId +
        item.item.entityBundle
      "
      :data-id="item"
      :parent-paragraph-bundle="isNested ? entity?.entityBundle : ''"
      data-editing="true"
      data-element-type="existing"
      :data-uuid="item.item?.uuid"
      :data-action-key="fieldName + ':' + item.item?.uuid"
      :data-host-type="entity?.entityTypeId"
      :data-host-bundle="entity?.entityBundle"
      :data-host-uuid="entity?.uuid"
      :data-paragraph-type="item.item?.entityBundle"
      :data-host-field-name="fieldName"
      :data-is-nested="isNested"
      class="draggable"
    />
  </component>
</template>

<script lang="ts">
export default {
  name: 'BlokkliDraggableList',
}
</script>

<script lang="ts" setup>
import type { SortableEvent } from 'sortablejs'
import { Sortable } from '#blokkli/sortable'
import { getDefinition } from '#blokkli/definitions'
import { buildDraggableItem, falsy } from '#blokkli/helpers'
import {
  DraggableExistingParagraphItem,
  DraggableHostData,
  DraggableItem,
  MoveBlokkliEvent,
  BlokkliFieldListConfig,
  BlokkliFieldList,
  BlokkliMutatedField,
  BlokkliFieldListEntity,
  BlokkliFieldListItemParagraph,
} from '#blokkli/types'
import { INJECT_MUTATED_FIELDS } from '../../../helpers/symbols'

const { adapter, state, eventBus, keyboard, types, dom } = useBlokkli()

let instance: Sortable | null = null

const mutatedFields = inject<Ref<BlokkliMutatedField[]>>(INJECT_MUTATED_FIELDS)

const container = ref<HTMLDivElement | null>(null)

const props = defineProps<{
  list: BlokkliFieldList<any>[]
  entity: BlokkliFieldListEntity
  fieldConfig: BlokkliFieldListConfig
  tag?: string
  isNested: boolean
}>()

const fieldKey = computed(() => {
  if (props.fieldConfig.name && props.entity.uuid) {
    return `${props.entity.uuid}:${props.fieldConfig.name}`
  }
})

watch(
  () => state.editMode.value,
  (mode) => {
    if (!instance) {
      return
    }
    if (mode === 'editing') {
      instance.option('disabled', false)
    } else {
      instance.option('disabled', true)
    }
  },
)

const cardinality = computed<number>(() => {
  if (props.fieldConfig && 'storage' in props.fieldConfig) {
    if (typeof props.fieldConfig.storage?.cardinality === 'number') {
      return props.fieldConfig.storage?.cardinality
    }
  }
  return -1
})

/**
 * The allowed paragraph types in this list.
 */
const allowedTypes = computed(() => {
  return (
    types.allowedTypes.value.find((v) => {
      return (
        v.entityType === props.entity.entityTypeId &&
        v.bundle === props.entity.entityBundle &&
        v.fieldName === props.fieldConfig.name
      )
    })?.allowedTypes || []
  )
})

const fieldName = computed(() => {
  return props.fieldConfig.name || ''
})

type CombinedParagraphsFieldItem = {
  item: BlokkliFieldListItemParagraph
  paragraph: any
}

const listToUse = computed<CombinedParagraphsFieldItem[]>(() => {
  if (props.entity.entityTypeId === 'paragraph') {
    return props.list as CombinedParagraphsFieldItem[]
  }
  return (mutatedFields?.value.find((v) => v.name === fieldName.value)?.field
    .list || []) as CombinedParagraphsFieldItem[]
})

function getItemFromEvent(e: MouseEvent): DraggableItem | undefined {
  if (!e.target) {
    return
  }
  const item = dom.findClosestBlock(e.target)
  if (!item) {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  return item
}

function onClick(e: MouseEvent) {
  e.stopPropagation()
  e.preventDefault()
  const item = getItemFromEvent(e)
  if (item && item.itemType === 'existing') {
    if (e.ctrlKey) {
      eventBus.emit('select:toggle', item.uuid)
    } else {
      eventBus.emit('select', item.uuid)
    }
  }
}

function onDoubleClick(e: MouseEvent) {
  if (e.ctrlKey) {
    return
  }
  const item = getItemFromEvent(e)
  if (item && item.itemType === 'existing') {
    eventBus.emit('editParagraph', {
      uuid: item.uuid,
      bundle: item.paragraphType,
    })
  }
}

const host = computed<DraggableHostData>(() => {
  return {
    type: props.entity.entityTypeId,
    uuid: props.entity.uuid,
    fieldName: props.fieldConfig.name!,
  }
})

function getPreviousItem(
  el: HTMLElement,
): DraggableExistingParagraphItem | undefined {
  if (
    el.previousElementSibling &&
    el.previousElementSibling instanceof HTMLElement
  ) {
    const item = buildDraggableItem(el.previousElementSibling)
    if (item?.itemType === 'existing') {
      return item
    }
  }
}

function onUpdate(e: Sortable.SortableEvent) {
  const item = buildDraggableItem(e.item)
  if (!item) {
    return
  }
  if (item.itemType === 'existing') {
    const previous = getPreviousItem(item.element)
    if (e.items.length > 1) {
      const uuids = e.items
        .map((el) => buildDraggableItem(el))
        .map((v) => (v?.itemType === 'existing' ? v.uuid : undefined))
        .filter(falsy)
      if (uuids.length > 1) {
        return state.mutateWithLoadingState(
          adapter.moveMultipleParagraphs({
            uuids,
            afterUuid: previous?.uuid,
            host: host.value,
          }),
        )
      }
    }
    moveParagraph({
      item,
      host: host.value,
      afterUuid: previous?.uuid,
    })
  }
}

const moveParagraph = (e: MoveBlokkliEvent) => {
  state.mutateWithLoadingState(
    adapter.moveParagraph(e),
    'Der Abschnitt konnte nicht verschoben werden.',
  )
}

function onStart(e: SortableEvent) {
  const rect = e.item.getBoundingClientRect()
  const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
  eventBus.emit('dragging:start', {
    rect,
    offsetX: originalEvent.clientX,
    offsetY: originalEvent.clientY,
  })
}

function onAdd(e: Sortable.SortableEvent) {
  const item = buildDraggableItem(e.item)
  eventBus.emit('removeGhosts')
  if (!item) {
    return
  }

  e.item.classList.add('bk-moved-item')
  const afterUuid =
    'element' in item ? getPreviousItem(item.element)?.uuid : undefined

  if (item.itemType === 'new') {
    if (e.newIndex !== undefined) {
      const definition = getDefinition(item.paragraphType)
      if (definition?.disableEdit) {
        return state.mutateWithLoadingState(
          adapter.addNewBlokkliItem({
            type: item.paragraphType,
            item,
            host: host.value,
            afterUuid,
          }),
        )
      } else {
        eventBus.emit('addNewBlokkliItem', {
          type: item.paragraphType,
          item,
          host: host.value,
          afterUuid,
        })
      }
    }
  } else if (item.itemType === 'clipboard' && adapter.addClipboardParagraph) {
    state.mutateWithLoadingState(
      adapter.addClipboardParagraph({
        afterUuid,
        item,
        host: host.value,
      }),
    )
  } else if (item.itemType === 'existing') {
    moveParagraph({
      item,
      host: host.value,
      afterUuid,
    })
  } else if (item.itemType === 'reusable') {
    state.mutateWithLoadingState(
      adapter.addReusableParagraph({
        item,
        host: host.value,
        afterUuid,
      }),
    )
  } else if (
    item.itemType === 'search_content' &&
    adapter.addContentSearchItemParagraph
  ) {
    state.mutateWithLoadingState(
      adapter.addContentSearchItemParagraph({
        item: item.searchItem,
        host: host.value,
        bundle: item.paragraphType,
        afterUuid,
      }),
    )
  }
}

function onEnd() {
  eventBus.emit('removeGhosts')
  eventBus.emit('dragging:end')
}

function onPut(_to: Sortable, _from: Sortable, dragEl: HTMLElement) {
  // Make sure cardinality is respected for this field.
  // A value of -1 means unlimited.
  if (cardinality.value !== -1 && listToUse.value.length >= cardinality.value) {
    return false
  }
  const item = buildDraggableItem(dragEl)
  if (!item) {
    return false
  }

  // An paragraph of type "from_library" is being dropped here. Use the bundle of the
  // nested paragraph instead to check if it's allowed.
  if (item.itemType === 'existing' && item.reusableBundle) {
    return allowedTypes.value.includes(item.reusableBundle)
  } else if (item.itemType === 'reusable') {
    return (
      allowedTypes.value.includes(item.paragraphBundle) &&
      allowedTypes.value.includes('from_library')
    )
  }
  if ('paragraphType' in item) {
    return allowedTypes.value.includes(item.paragraphType)
  } else if ('bundles' in item) {
    return item.bundles.every((v) => {
      return allowedTypes.value.includes(v)
    })
  }

  return false
}

function updateSelection(e: SortableEvent) {
  if (keyboard.isPressingControl.value) {
    const uuids = e.items.map((v) => v.dataset.uuid).filter(falsy)
    eventBus.emit('select:end', uuids)
  } else {
    const item = buildDraggableItem(e.item)
    if (item?.itemType === 'existing') {
      document.querySelectorAll('.sortable-selected').forEach((el) => {
        Sortable.utils.deselect(el as any)
      })
      Sortable.utils.select(item.element)
      eventBus.emit('select', item.uuid)
    }
  }
}

function onSelect(e: SortableEvent) {
  return
  updateSelection(e)
}

function onDeselect(e: SortableEvent) {
  return
  updateSelection(e)
}

onMounted(() => {
  if (container.value) {
    instance = new Sortable(container.value, {
      disabled: state.editMode.value !== 'editing',
      forceFallback: true,
      swapThreshold: 0.5,
      multiDrag: true,
      multiDragKey: 'ctrl' as any,
      avoidImplicitDeselect: true,
      group: {
        name: 'types',
        put: onPut,
        revertClone: false,
      },
      ignore: '.bk-hidden',
      fallbackClass: 'sortable-fallback',
      fallbackOnBody: false,
      forceAutoScrollFallback: true,
      emptyInsertThreshold: 100,
      animation: 200,
      preventOnFilter: true,
      dragoverBubble: false,
      onSelect,
      onDeselect,
      onStart,
      onUpdate,
      onEnd,
      onAdd,
    })
  }
})

onUnmounted(() => {
  if (instance) {
    instance.destroy()
  }
})
</script>
