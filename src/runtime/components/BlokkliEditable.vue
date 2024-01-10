<template>
  <component :is="tag" v-bind="attrs">
    <slot :value="renderedValue"></slot>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount } from '#imports'
import type {
  EditableType,
  BlokkliEditableDirectiveArgs,
  EntityContext,
  ItemEditContext,
  EditableFieldUpdateEvent,
} from '#blokkli/types'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_ENTITY_CONTEXT,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/symbols'

const props = withDefaults(
  defineProps<{
    name: string
    value: string
    tag?: string
    label?: string
    maxlength?: number
    required?: boolean
    type?: EditableType
  }>(),
  {
    label: '',
    tag: 'div',
    type: 'plaintext',
    maxlength: -1,
  },
)

const valueOverride = ref('')
const isEditing = inject<boolean>(INJECT_IS_EDITING, false)
const entity = inject<EntityContext>(INJECT_ENTITY_CONTEXT)
const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)

if (!entity) {
  throw new Error('Missing entity context.')
}

const renderedValue = computed(() => {
  return valueOverride.value || props.value
})

const fieldConfig = computed<BlokkliEditableDirectiveArgs>(() => {
  return {
    label: props.label,
    name: props.name,
    maxlength: props.maxlength,
    required: props.required,
    type: props.type,
  }
})

const attrs = computed(() => {
  if (isEditing && props.name) {
    return {
      'data-blokkli-editable-field': props.name,
      'data-blokkli-editable-component': true,
      'data-blokkli-editable-value': props.value,
      'data-blokkli-editable-field-config': JSON.stringify(fieldConfig.value),
    }
  }
})

const onEditableUpdateValue = (e: EditableFieldUpdateEvent) => {
  if (e.name === props.name && e.entityUuid === entity.uuid) {
    valueOverride.value = e.value
  }
}

onMounted(() => {
  if (!isEditing || !editContext) {
    return
  }

  editContext.eventBus.on('editable:update', onEditableUpdateValue)
})

onBeforeUnmount(() => {
  if (editContext) {
    editContext.eventBus.off('editable:update', onEditableUpdateValue)
  }
})
</script>
