<template>
  <Teleport to="body">
    <Transition :name="hasTransition ? 'bk-editable' : undefined">
      <Overlay v-if="editable" v-bind="editable" :key="key" />
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  computed,
  ref,
  useBlokkli,
  watch,
  defineBlokkliFeature,
} from '#imports'
import Overlay from './Overlay/index.vue'
import type {
  BlokkliEditableDirectiveArgs,
  DraggableExistingBlock,
  EditableFieldConfig,
  EntityContext,
} from '#blokkli/types'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import { falsy } from '#blokkli/helpers'

defineBlokkliFeature({
  id: 'editable-field',
  icon: 'textbox',
  label: 'Editable Field',
  requiredAdapterMethods: ['updateFieldValue'],
  description: 'Implements a form overlay to edit a single field of a block.',
})

type Editable = {
  fieldName: string
  host: DraggableExistingBlock | EntityContext
  element: HTMLElement
  config: EditableFieldConfig
  isComponent?: boolean
  value?: string
}

const { selection, adapter, types, $t, dom, runtimeConfig } = useBlokkli()
const editable = ref<Editable | null>(null)
const hasTransition = ref(false)

const key = computed(() => {
  if (!editable.value) {
    return ''
  }
  return editable.value.host.uuid + editable.value.fieldName
})

const getHost = (
  el: HTMLElement,
): DraggableExistingBlock | EntityContext | undefined => {
  const block = dom.findClosestBlock(el)
  if (block) {
    return block
  }

  return dom.findClosestEntityContext(el)
}

const buildEditable = (
  fieldName: string,
  element: HTMLElement,
): Editable | undefined => {
  const host = getHost(element)
  if (!host) {
    return
  }
  const hostEntityType =
    'type' in host ? host.type : runtimeConfig.itemEntityType
  const hostEntityBundle = 'bundle' in host ? host.bundle : host.itemBundle
  const argsValue = element.dataset.blokkliEditableFieldConfig
  const args: BlokkliEditableDirectiveArgs = argsValue
    ? JSON.parse(argsValue)
    : undefined

  // Adapter doesn't support editable frames, return.
  if (args?.type === 'frame' && !adapter.buildEditableFrameUrl) {
    return
  }

  const config = types.editableFieldConfig.value.find((v) => {
    return (
      v.entityType === hostEntityType &&
      v.entityBundle === hostEntityBundle &&
      v.name === fieldName
    )
  })

  if (!config) {
    throw new Error(
      `Failed to load editable field config for field "${fieldName}" on entity type "${hostEntityType}" of bundle "${hostEntityBundle}"`,
    )
  }

  return {
    fieldName,
    host,
    element,
    isComponent: element.dataset.blokkliEditableComponent === 'true',
    value: element.dataset.blokkliEditableValue || '',
    config,
  }
}

onBlokkliEvent('editable:focus', (e) => {
  hasTransition.value = !editable.value
  editable.value = buildEditable(e.fieldName, e.element) || null
  if (editable.value) {
    selection.editableActive.value = true
  }
})

defineCommands(() => {
  // Find editable fields in the current selection.
  const editables: Editable[] = selection.blocks.value.flatMap((v) => {
    return [...v.element().querySelectorAll('[data-blokkli-editable-field]')]
      .map((el) => {
        if (!(el instanceof HTMLElement)) {
          return
        }

        // Find closest block.
        const block = el.closest('[data-uuid]')
        if (!(block instanceof HTMLElement)) {
          return
        }

        // Skip editable fields of nested blocks because this would lead to a
        // ton of commands with the same name, e.g. when the selected block
        // has 20 nested blocks with editable fields. This would be pretty
        // useless.
        if (block.dataset.uuid !== v.uuid) {
          return
        }

        const name = el.dataset.blokkliEditableField
        if (!name) {
          return
        }

        return buildEditable(name, el)
      })
      .filter(falsy)
  })

  return editables.map((v) => {
    return {
      id: 'feature:editable:edit:' + v.fieldName,
      group: 'selection',
      label: $t('editableCommandEdit', 'Edit field "@name"').replace(
        '@name',
        v.label,
      ),
      icon: 'textbox',
      disabled: false,
      callback: () => {
        editable.value = v
      },
    }
  })
})

watch(selection.editableActive, (isActive) => {
  if (!isActive) {
    hasTransition.value = true
    editable.value = null
  }
})
</script>
