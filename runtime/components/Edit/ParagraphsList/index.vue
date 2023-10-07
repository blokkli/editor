<template>
  <component
    ref="container"
    class="pb-paragraphs-container"
    :class="{ 'is-empty': !listToUse.length }"
    :is="tag || 'div'"
    @click.capture="onClick"
    @dblclick.capture="onDoubleClick"
    :ondrop="onDrop"
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
      :key="'i_' + item.item?.uuid + entity.uuid + entity.entityTypeId"
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
import Sortable, { SortableEvent } from 'sortablejs'
import { eventBus } from './../eventBus'
import { buildDraggableItem } from '../helpers'
import {
  DraggableExistingParagraphItem,
  DraggableHostData,
  DraggableItem,
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
  list: PbFieldItemFragment[]
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

function onClick(e: MouseEvent) {
  const item = getItemFromEvent(e)
  if (item && item.itemType === 'existing') {
    if (e.metaKey || e.ctrlKey) {
      eventBus.emit('selectAdditional', item)
    } else {
      eventBus.emit('select', item)
    }
    e.preventDefault()
    e.stopPropagation()
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

function onDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer && e.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    ;[...e.dataTransfer.items].forEach((item, i) => {
      // If dropped items aren't files, reject them
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          console.log(file)
          console.log(`… file[${i}].name = ${file.name}`)
        }
      }
    })
  } else if (e.dataTransfer?.files) {
    // Use DataTransfer interface to access the file(s)
    ;[...e.dataTransfer.files].forEach((file, i) => {
      console.log(`… file[${i}].name = ${file.name}`)
    })
  }
}

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
    if (item.itemType === 'existing') {
      eventBus.emit('moveParagraph', {
        item,
        host: host.value,
        afterUuid: previous?.uuid,
      })
    }
  }
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
  if (item.itemType === 'multiple_existing') {
    const previous = getPreviousItem(e.item)
    const afterUuid = previous?.uuid
    eventBus.emit('moveMultipleParagraphs', {
      uuids: item.uuids,
      host: host.value,
      afterUuid,
    })
    return
  }
  const afterUuid = getPreviousItem(item.element)?.uuid

  if (item.itemType === 'new') {
    if (e.newIndex !== undefined) {
      eventBus.emit('addNewParagraph', {
        type: item.paragraphType,
        item,
        host: host.value,
        afterUuid,
      })
      return
    }
  } else if (item.itemType === 'clipboard') {
    eventBus.emit('addClipboardParagraph', {
      afterUuid,
      item,
      host: host.value,
    })
  } else if (item.itemType === 'existing') {
    eventBus.emit('moveParagraph', {
      item,
      host: host.value,
      afterUuid,
    })
  } else if (item.itemType === 'reusable') {
    eventBus.emit('addReusableParagraph', {
      item,
      host: host.value,
      afterUuid,
    })
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

onMounted(() => {
  if (container.value) {
    instance = new Sortable(container.value, {
      disabled: editMode?.value !== 'editing',
      forceFallback: true,
      swapThreshold: 0.5,
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
