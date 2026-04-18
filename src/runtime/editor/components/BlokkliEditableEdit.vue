<template>
  <component
    :is="tag"
    ref="root"
    :data-blokkli-editable-field="name ?? undefined"
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
  INJECT_IS_IN_REUSABLE,
} from '#blokkli/helpers/injections'
import type { EditableFieldUpdateEvent } from '#blokkli/editor/events'

const props = withDefaults(
  defineProps<{
    name?: string | null
    value?: string
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

const root = useTemplateRef('root')
const entity = inject(INJECT_ENTITY_CONTEXT, null)
const editContext = inject(INJECT_EDIT_CONTEXT, null)
const app = inject(INJECT_APP, null)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)

const valueOverride = ref('')

const renderedValue = computed(() => valueOverride.value || props.value || '')

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
  app.directive.unregisterDirectiveElement(root.value, name, entity, 'editable')
}

onMounted(() => {
  if (!editContext || !app || isInReusable) {
    return
  }

  editContext.eventBus.on('editable:update', onEditableUpdateValue)
  editContext.eventBus.on('state:reloaded', onStateReloaded)

  registerDirective(props.name)
})

watch(
  () => props.name,
  (newName, oldName) => {
    if (!app || !entity || isInReusable) {
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
</script>
