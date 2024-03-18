<template>
  <component :is="tag" v-bind="attrs">
    <slot :value="renderedValue"></slot>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount } from '#imports'
import type {
  ItemEditContext,
  EditableFieldUpdateEvent,
  EntityContext,
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
  }>(),
  {
    tag: 'div',
  },
)

const valueOverride = ref('')
const isEditing = inject<boolean>(INJECT_IS_EDITING, false)
const entity = inject<EntityContext>(INJECT_ENTITY_CONTEXT)
const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)

if (!entity) {
  throw new Error('Missing entity context.')
}

const renderedValue = computed(() => valueOverride.value || props.value)

const attrs = computed(() => {
  if (isEditing && props.name) {
    return {
      'data-blokkli-editable-field': props.name,
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
