<template>
  <component :is="tag" v-bind="attrs" ref="root">
    <slot :value="renderedValue" />
  </component>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  inject,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
} from '#imports'
import type {
  ItemEditContext,
  EditableFieldUpdateEvent,
  EntityContext,
  BlokkliApp,
} from '#blokkli/types'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_ENTITY_CONTEXT,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
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

defineSlots<{
  default(props: { value: string }): any
}>()

const root = useTemplateRef('root')

const valueOverride = ref('')
const isEditing = inject<boolean>(INJECT_IS_EDITING, false)
const entity = inject<EntityContext>(INJECT_ENTITY_CONTEXT)
const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)
const app = inject<BlokkliApp | null>(INJECT_APP, null)
const isInReusable = inject<boolean>(INJECT_IS_IN_REUSABLE, false)

if (!entity) {
  throw new Error('Missing entity context.')
}

const renderedValue = computed(() => valueOverride.value || props.value)

const attrs = computed(() => {
  if (isEditing && props.name) {
    return {
      'data-blokkli-editable-field': props.name,
      'data-blokkli-editable-component': 'true',
      'data-blokkli-editable-value': props.value,
    }
  }

  return undefined
})

const onEditableUpdateValue = (e: EditableFieldUpdateEvent) => {
  if (e.name === props.name && e.entityUuid === entity.uuid) {
    valueOverride.value = e.value
  }
}

onMounted(() => {
  if (!isEditing || !editContext || !app || isInReusable) {
    return
  }

  editContext.eventBus.on('editable:update', onEditableUpdateValue)

  if (root.value instanceof HTMLElement && entity) {
    app.editable.registerEditableField(root.value, props.name, entity)
  }
})

onBeforeUnmount(() => {
  if (editContext) {
    editContext.eventBus.off('editable:update', onEditableUpdateValue)
  }
  if (app && root.value instanceof HTMLElement && entity) {
    app.editable.unregisterEditableField(root.value, props.name, entity)
  }
})
</script>
