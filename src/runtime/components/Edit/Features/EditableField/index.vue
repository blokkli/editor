<template>
  <Teleport to="body">
    <Transition :name="hasTransition ? 'bk-editable' : undefined">
      <Overlay v-if="editable" v-bind="editable" :key="key" @close="close" />
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
  requiredAdapterMethods: ['updateFieldValue', 'getEditableFieldConfig'],
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
  uuid?: string,
): DraggableExistingBlock | EntityContext | undefined => {
  if (uuid) {
    const block = dom.findBlock(uuid)
    if (block) {
      return block
    }
  }

  return dom.findClosestEntityContext(dom.getActiveProviderElement())
}

const buildEditable = (
  fieldName: string,
  uuid?: string,
): Editable | undefined => {
  const host = getHost(uuid)
  if (!host) {
    return
  }
  const hostEntityType =
    'type' in host ? host.type : runtimeConfig.itemEntityType
  const hostEntityBundle = 'bundle' in host ? host.bundle : host.itemBundle

  const config = types.editableFieldConfig.forName(
    hostEntityType,
    hostEntityBundle,
    fieldName,
  )

  if (!config) {
    throw new Error(
      `Failed to load editable field config for field "${fieldName}" on entity type "${hostEntityType}" of bundle "${hostEntityBundle}"`,
    )
  }

  // Adapter doesn't support editable frames, return.
  if (config.type === 'frame' && !adapter.buildEditableFrameUrl) {
    return
  }

  const hostElement =
    'itemBundle' in host ? host.element() : dom.getActiveProviderElement()
  const element = hostElement.querySelector(
    `[data-blokkli-editable-field="${fieldName}"]`,
  )

  if (!(element instanceof HTMLElement)) {
    return
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
  editable.value = buildEditable(e.fieldName, e.uuid) || null
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

        return buildEditable(name, block.dataset.uuid)
      })
      .filter(falsy)
  })

  return editables.map((v) => {
    return {
      id: 'feature:editable:edit:' + v.fieldName,
      group: 'selection',
      label: $t('editableCommandEdit', 'Edit field "@name"').replace(
        '@name',
        v.config.label,
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

watch(editable, (v) => {
  if (!v && selection.editableActive.value) {
    selection.editableActive.value = false
  }
})

const close = () => {
  editable.value = null
  selection.editableActive.value = false
}
</script>
