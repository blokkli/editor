<template>
  <Teleport to="body">
    <BlokkliTransition name="caret-tooltip" :enabled="hasTransition">
      <Overlay
        v-if="selectedEditable"
        v-bind="selectedEditable"
        :key="key"
        @close="close"
      />
    </BlokkliTransition>
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
import type { EditableFieldConfig, EntityContext } from '#blokkli/types'
import { BlokkliTransition } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import { falsy } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'

defineBlokkliFeature({
  id: 'editable-field',
  icon: 'textbox',
  label: 'Editable Field',
  requiredAdapterMethods: ['updateFieldValue', 'getEditableFieldConfig'],
  description: 'Implements a form overlay to edit a single field of a block.',
})

type Editable = {
  fieldName: string
  host: EntityContext
  element: HTMLElement
  config: EditableFieldConfig
  isComponent?: boolean
  value?: string
}

const { selection, adapter, types, $t, state, directive, blocks, context } =
  useBlokkli()
const selectedEditable = ref<Editable | null>(null)
const hasTransition = ref(false)

const key = computed(() => {
  if (!selectedEditable.value) {
    return ''
  }
  return selectedEditable.value.host.uuid + selectedEditable.value.fieldName
})

const getHost = (uuid?: string): EntityContext | undefined => {
  if (uuid) {
    const block = blocks.getBlock(uuid)
    if (block) {
      return {
        type: itemEntityType,
        bundle: block.bundle,
        uuid: block.uuid,
      }
    }
  }

  return {
    type: context.value.entityType,
    bundle: context.value.entityBundle,
    uuid: context.value.entityUuid,
  }
}

const buildEditable = (
  fieldName: string,
  uuid?: string,
): Editable | undefined => {
  const host = getHost(uuid)
  if (!host) {
    return
  }
  if (host.bundle === 'from_library') {
    return
  }

  const config = types.editableFieldConfig.forName(
    host.type,
    host.bundle,
    fieldName,
  )

  if (!config) {
    let message = `Failed to load editable field config for field "${fieldName}" on entity type "${host.type}" of bundle "${host.bundle}"`
    if (uuid) {
      message += ` with uuid "${uuid}"`
    }
    throw new Error(message)
  }

  // Adapter doesn't support editable frames, return.
  if (config.type === 'frame' && !adapter.buildEditableFrameUrl) {
    return
  }

  const element = directive.findEditableElement(fieldName, host)

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
  if (!state.canEdit.value) {
    return
  }
  hasTransition.value = !selectedEditable.value
  selectedEditable.value = buildEditable(e.fieldName, e.uuid) || null
  if (selectedEditable.value) {
    selection.editableActive.value = true
  }
})

defineCommands(() => {
  // Disable editable commands when more than 5 blocks are selected.
  if (selection.items.value.length > 5) {
    return []
  }

  // Find editable fields in the current selection.
  const editables: Editable[] = selection.items.value.flatMap((item) => {
    return directive
      .getEditablesForBlock(item.uuid)
      .map((v) => {
        return buildEditable(v.fieldName, item.uuid)
      })
      .filter(falsy)
  })

  return editables.map((v) => {
    return {
      id: 'feature:editable:edit:' + v.host.uuid + ':' + v.fieldName,
      group: 'selection',
      label: $t('editableCommandEdit', 'Edit field "@name"').replace(
        '@name',
        v.config.label,
      ),
      icon: 'textbox',
      disabled: false,
      callback: () => {
        selectedEditable.value = v
      },
    }
  })
})

watch(selection.editableActive, (isActive) => {
  if (!isActive) {
    hasTransition.value = true
    selectedEditable.value = null
  }
})

watch(selectedEditable, (v) => {
  if (!v && selection.editableActive.value) {
    selection.editableActive.value = false
  }
})

const close = () => {
  selectedEditable.value = null
  selection.editableActive.value = false
}
</script>
