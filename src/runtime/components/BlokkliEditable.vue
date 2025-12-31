<template>
  <component
    :is="tag"
    ref="root"
    :data-blokkli-editable-field="isEditing ? name : undefined"
  >
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
import { onBlokkliEvent } from '#blokkli/editor/composables'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_ENTITY_CONTEXT,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
} from '#blokkli/helpers/injections'
import type { EditableFieldUpdateEvent } from '#blokkli/editor/events';

const props = withDefaults(
  defineProps<{
    /**
     * The (machine) name of the field that is editable.
     */
    name: string

    /**
     * The text value.
     */
    value?: string

    /**
     * The tag to use for rendering the wrapper.
     *
     * @default "div"
     */
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
const isEditing = inject(INJECT_IS_EDITING, false)
const entity = inject(INJECT_ENTITY_CONTEXT, null)
const editContext = inject(INJECT_EDIT_CONTEXT, null)
const app = inject(INJECT_APP, null)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)

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

onBlokkliEvent('state:reloaded', () => {
  valueOverride.value = ''
})

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
