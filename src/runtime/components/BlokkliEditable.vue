<template>
  <component
    :is="tag"
    ref="root"
    :data-blokkli-editable-field="isEditingBuild ? name : undefined"
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
  watch,
} from '#imports'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_ENTITY_CONTEXT,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
} from '#blokkli/helpers/injections'
import type { EditableFieldUpdateEvent } from '#blokkli/editor/events'

const props = withDefaults(
  defineProps<{
    /**
     * The (machine) name of the field that is editable.
     */
    name?: string | null

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
    name: null,
  },
)

defineSlots<{
  default(props: { value: string }): any
}>()

const isEditingBuild = import.meta.blokkliEditing

const root = useTemplateRef('root')

const valueOverride = ref('')

const renderedValue = computed(() => valueOverride.value || props.value || '')

if (isEditingBuild) {
  const isEditing = inject(INJECT_IS_EDITING, false)
  const entity = inject(INJECT_ENTITY_CONTEXT, null)
  const editContext = inject(INJECT_EDIT_CONTEXT, null)
  const app = inject(INJECT_APP, null)
  const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)

  const onEditableUpdateValue = (e: EditableFieldUpdateEvent) => {
    if (e.name === props.name && e.entityUuid === entity?.uuid) {
      valueOverride.value = e.value
    }
  }

  function getValueCallback() {
    return props.value
  }

  function onStateReloaded() {
    valueOverride.value = ''
  }

  function registerDirective(name: string | null | undefined) {
    if (!name || !app || !(root.value instanceof HTMLElement) || !entity) {
      return
    }
    app.directive.registerDirectiveElement(
      root.value,
      name,
      entity,
      'editable',
      true,
      getValueCallback,
    )
  }

  function unregisterDirective(name: string | null | undefined) {
    if (!name || !app || !(root.value instanceof HTMLElement) || !entity) {
      return
    }
    app.directive.unregisterDirectiveElement(
      root.value,
      name,
      entity,
      'editable',
    )
  }
  onMounted(() => {
    if (!isEditing || !editContext || !app || isInReusable) {
      return
    }

    editContext.eventBus.on('editable:update', onEditableUpdateValue)
    editContext.eventBus.on('state:reloaded', onStateReloaded)

    registerDirective(props.name)
  })

  watch(
    () => props.name,
    (newName, oldName) => {
      if (!isEditing || !app || !entity || isInReusable) {
        return
      }
      unregisterDirective(oldName)
      registerDirective(newName)
    },
  )

  onBeforeUnmount(() => {
    if (editContext) {
      editContext.eventBus.off('editable:update', onEditableUpdateValue)
      editContext.eventBus.off('state:reloaded', onStateReloaded)
    }

    unregisterDirective(props.name)
  })
}
</script>
