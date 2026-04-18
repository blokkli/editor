<template>
  <Teleport v-if="ui.mainLayoutElement.value" :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="caret-tooltip" :enabled="hasTransition">
      <Overlay
        v-if="activeField"
        v-bind="activeField"
        :key="activeFieldKey"
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
  defineBlokkliFeature,
  watch,
} from '#imports'
import {
  onBlokkliEvent,
  defineDropAreas,
  defineCommands,
} from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import { falsy } from '#blokkli/helpers'
import type { DroppableFieldConfig } from '#blokkli/editor/features/editable-field/types'
import type { EntityContext } from '#blokkli/types'
import type { DropArea } from '#blokkli/editor/types/ui'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import { BlokkliTransition } from '#blokkli/editor/components'
import Overlay from './Overlay/index.vue'
import './types'

defineBlokkliFeature({
  id: 'droppable-field-edit',
  icon: 'bk_mdi_edit',
  label: 'Droppable Field Edit',
  description:
    'Editing mode for multi-value droppable fields (add, remove, reorder items).',
  requiredAdapterMethods: ['getDroppableFieldItems', 'updateDroppableField'],
})

const { selection, ui, directive, types, state, adapter, $t } = useBlokkli()

type ActiveField = {
  fieldName: string
  entity: EntityContext
  element: HTMLElement
  config: DroppableFieldConfig
}

const activeField = ref<ActiveField | null>(null)
const hasTransition = ref(false)

const activeFieldKey = computed(() => {
  if (!activeField.value) {
    return ''
  }
  return activeField.value.entity.uuid + activeField.value.fieldName
})

function openField(field: ActiveField) {
  hasTransition.value = !activeField.value
  selection.activeDroppableFieldLabel.value = field.config.label
  activeField.value = field
}

function close() {
  activeField.value = null
  selection.activeDroppableFieldLabel.value = null
}

// Commands: context menu entries for droppable fields on selected blocks.
defineCommands(() => {
  if (selection.items.value.length !== 1) {
    return []
  }

  const block = selection.items.value[0]!

  return directive
    .getDroppableElements()
    .filter(
      (field) => field.uuid === block.uuid && field.type === itemEntityType,
    )
    .map((field) => {
      const config = types.getDroppableFieldConfig(field.fieldName, field)
      return {
        id: `feature:droppable-field:edit:${field.uuid}:${field.fieldName}`,
        group: 'selection' as const,
        label: $t('droppableFieldCommandEdit', 'Edit field "@name"').replace(
          '@name',
          config.label,
        ),
        icon: 'bk_mdi_edit' as const,
        disabled: false,
        callback: () =>
          openField({
            fieldName: field.fieldName,
            entity: {
              type: field.type,
              bundle: field.bundle,
              uuid: field.uuid,
            },
            element: field.element,
            config,
          }),
      }
    })
    .filter(falsy)
})

// Listen for external open event.
onBlokkliEvent('droppable:open', (e) => {
  if (!state.canEdit.value) {
    return
  }

  const droppableElements = directive.getDroppableElements()
  const field = droppableElements.find(
    (f) => f.uuid === e.uuid && f.fieldName === e.fieldName,
  )
  if (!field) {
    return
  }

  const config = types.getDroppableFieldConfig(e.fieldName, field)

  openField({
    fieldName: e.fieldName,
    entity: {
      type: field.type,
      bundle: field.bundle,
      uuid: field.uuid,
    },
    element: field.element,
    config,
  })
})

// If activeDroppableFieldLabel is cleared externally, close.
watch(selection.activeDroppableFieldLabel, (v) => {
  if (!v && activeField.value) {
    hasTransition.value = true
    activeField.value = null
  }
})

watch(activeField, (v) => {
  if (!v && selection.activeDroppableFieldLabel.value) {
    selection.activeDroppableFieldLabel.value = null
  }
})

// Drop areas: "Add to {field}" for multi-value droppable fields.
// Suppressed when the overlay is open — the Overlay registers its own drop area.
defineDropAreas((dragItems) => {
  if (activeField.value) {
    return
  }

  if (!adapter.updateDroppableField || !adapter.getDroppableFieldItems) {
    return
  }

  if (dragItems.length !== 1) {
    return
  }

  const item = dragItems[0]!
  if (item.itemType !== 'media_library') {
    return
  }

  return directive
    .getDroppableElements()
    .map<DropArea | undefined>((field) => {
      if (field.type !== itemEntityType) {
        return
      }
      const config = types.getDroppableFieldConfig(field.fieldName, field)
      if (config.cardinality === 1) {
        return
      }

      const allowedBundles = config.allowed.find(
        (v) => v.type === 'media',
      )?.bundles
      if (!allowedBundles || !allowedBundles.includes(item.mediaBundle)) {
        return
      }

      const currentCount = directive.getDroppableItemCount(
        field.fieldName,
        field,
      )
      if (config.cardinality > 0 && currentCount >= config.cardinality) {
        return
      }

      const host: BlokkliItemHost = {
        uuid: field.uuid,
        type: field.type,
        fieldName: field.fieldName,
      }

      return {
        id: `droppable-field-add:${field.uuid}:${field.fieldName}`,
        label: $t('droppableFieldAdd', 'Add to @field').replace(
          '@field',
          config.label,
        ),
        element: field.element,
        icon: 'bk_mdi_add',
        onDrop: async () => {
          const current = await adapter.getDroppableFieldItems!({ host })
          const items = [
            ...current.map((i) => ({
              type: 'existing' as const,
              uuid: i.uuid,
            })),
            { type: 'new' as const, mediaId: item.mediaId },
          ]
          return state.mutateWithLoadingState(
            () => adapter.updateDroppableField!({ host, items }),
            $t('droppableFieldAddFailed', 'Failed to add item.'),
          )
        },
      }
    })
    .filter(falsy)
})
</script>

<script lang="ts">
export default {
  name: 'DroppableFieldEdit',
}
</script>
