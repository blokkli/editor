<template>
  <component
    ref="container"
    class="pb-paragraphs-container"
    :class="{ 'is-empty': !listToUse.length }"
    :is="tag || 'div'"
    @dblclick.capture="onDoubleClick"
    :data-field-name="fieldConfig.name"
    :data-field-label="fieldConfig.label"
    :data-field-is-nested="isNested"
    :data-host-entity-type="entity.entityTypeId"
    :data-host-entity-uuid="entity.uuid"
    :data-field-key="fieldKey"
  >
    <PbItem
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
  name: 'PbParagraphsList',
}
</script>

<script lang="ts" setup>
import type { SortableEvent } from 'sortablejs'
import { Sortable } from './../sortable'
import { definitions } from '#nuxt-paragraphs-builder/definitions'
import { buildDraggableItem, falsy } from '../helpers'
import {
  DraggableExistingParagraphItem,
  DraggableHostData,
  DraggableItem,
  MoveParagraphEvent,
} from '../types'
import {
  PbAllowedBundle,
  PbFieldConfig,
  PbFieldItemFragment,
  PbMutatedField,
  PbFieldEntity,
  PbFieldItemParagraphFragment,
  PbEditMode,
} from '../../../types'

const { adapter, mutateWithLoadingState, eventBus, isPressingControl } =
  useParagraphsBuilderStore()

let instance: Sortable | null = null

const editMode = inject<ComputedRef<PbEditMode>>('paragraphsBuilderEditMode')

const mutatedFields = inject<Ref<PbMutatedField[]>>(
  'paragraphsBuilderMutatedFields',
)

const allAllowedTypes = inject<ComputedRef<PbAllowedBundle[]>>(
  'paragraphsBuilderAllowedTypes',
)

const container = ref<HTMLDivElement | null>(null)

const props = defineProps<{
  list: PbFieldItemFragment<any>[]
  entity: PbFieldEntity
  fieldConfig: PbFieldConfig
  tag?: string
  isNested: boolean
}>()

const fieldKey = computed(() => {
  if (props.fieldConfig.name && props.entity.uuid) {
    return `${props.entity.uuid}:${props.fieldConfig.name}`
  }
})

watch(
  () => editMode?.value,
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
    allAllowedTypes?.value.find((v) => {
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
  item: PbFieldItemParagraphFragment
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
  if (e.target && e.target instanceof HTMLElement) {
    const el = e.target.closest('[data-element-type="existing"]')
    if (el && el instanceof HTMLElement) {
      const item = buildDraggableItem(el)
      if (item && item.itemType === 'existing') {
        e.preventDefault()
        e.stopPropagation()
        return item
      }
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
        return mutateWithLoadingState(
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

const moveParagraph = (e: MoveParagraphEvent) => {
  mutateWithLoadingState(
    adapter.moveParagraph(e),
    'Der Abschnitt konnte nicht verschoben werden.',
  )
}

function onStart(e: SortableEvent) {
  const rect = e.item.getBoundingClientRect()
  const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
  eventBus.emit('draggingStart', {
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

  e.item.classList.add('pb-moved-item')
  const afterUuid =
    'element' in item ? getPreviousItem(item.element)?.uuid : undefined

  if (item.itemType === 'new') {
    if (e.newIndex !== undefined) {
      const definition = definitions.find(
        (v) => v.bundle === item.paragraphType,
      )
      if (definition?.disableEdit) {
        return mutateWithLoadingState(
          adapter.addNewParagraph({
            type: item.paragraphType,
            item,
            host: host.value,
            afterUuid,
          }),
        )
      } else {
        eventBus.emit('addNewParagraph', {
          type: item.paragraphType,
          item,
          host: host.value,
          afterUuid,
        })
      }
    }
  } else if (item.itemType === 'clipboard') {
    mutateWithLoadingState(
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
    mutateWithLoadingState(
      adapter.addReusableParagraph({
        item,
        host: host.value,
        afterUuid,
      }),
    )
  }
}

function onEnd() {
  eventBus.emit('removeGhosts')
  eventBus.emit('draggingEnd')
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
  if (isPressingControl.value) {
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
  updateSelection(e)
}

function onDeselect(e: SortableEvent) {
  updateSelection(e)
}

onMounted(() => {
  if (container.value) {
    instance = new Sortable(container.value, {
      disabled: editMode?.value !== 'editing',
      forceFallback: true,
      swapThreshold: 0.5,
      multiDrag: true,
      multiDragKey: 'ctrl' as any,
      avoidImplicitDeselect: false,
      group: {
        name: 'types',
        put: onPut,
        revertClone: false,
      },
      ignore: '.pb-hidden',
      fallbackClass: 'sortable-fallback',
      fallbackOnBody: false,
      forceAutoScrollFallback: true,
      emptyInsertThreshold: 20,
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
