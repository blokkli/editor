<template>
  <component :is="tag" ref="root">
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
    value?: string
    tag?: string
  }>(),
  {
    tag: 'div',
    value: '',
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

function getValueCallback() {
  return props.value
}

const renderedValue = computed(() => valueOverride.value || props.value || '')

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
    app.directive.registerDirectiveElement(
      root.value,
      props.name,
      entity,
      'editable',
      true,
      getValueCallback,
    )
  }
})

onBeforeUnmount(() => {
  if (editContext) {
    editContext.eventBus.off('editable:update', onEditableUpdateValue)
  }
  if (app && root.value instanceof HTMLElement && entity) {
    app.directive.unregisterDirectiveElement(
      root.value,
      props.name,
      entity,
      'editable',
    )
  }
})
</script>
