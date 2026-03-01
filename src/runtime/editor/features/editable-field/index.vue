<template>
  <Teleport :to="ui.mainLayoutElement.value">
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
import type { EntityContext } from '#blokkli/types'
import { BlokkliTransition } from '#blokkli/editor/components'
import { falsy } from '#blokkli/helpers'
import { fromLibraryBlockBundle, itemEntityType } from '#blokkli-build/config'
import { defineCommands, onBlokkliEvent } from '#blokkli/editor/composables'
import type { EditableFieldConfig } from './types'

defineBlokkliFeature({
  id: 'editable-field',
  icon: 'bk_mdi_text_select_end',
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

const { selection, adapter, types, $t, state, directive, blocks, context, ui } =
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
  if (host.bundle === fromLibraryBlockBundle) {
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

  const editable = directive.findEditable(fieldName, host)
  if (!editable) {
    return
  }

  return {
    fieldName,
    host,
    element,
    isComponent: editable.isComponent,
    value: editable.getValue ? editable.getValue() : '',
    config,
  }
}

onBlokkliEvent('editable:open', (e) => {
  if (!state.canEdit.value) {
    return
  }
  hasTransition.value = !selectedEditable.value
  selectedEditable.value = buildEditable(e.fieldName, e.uuid) || null
  if (selectedEditable.value) {
    selection.activeEditableLabel.value = selectedEditable.value.config.label
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
      icon: 'bk_mdi_text_select_end',
      disabled: false,
      callback: () => {
        selectedEditable.value = v
      },
    }
  })
})

watch(selection.activeEditableLabel, (isActive) => {
  if (!isActive) {
    hasTransition.value = true
    selectedEditable.value = null
  }
})

watch(selectedEditable, (v) => {
  if (!v && selection.activeEditableLabel.value) {
    selection.activeEditableLabel.value = null
  }
})

const close = () => {
  selectedEditable.value = null
  selection.activeEditableLabel.value = null
}
</script>
