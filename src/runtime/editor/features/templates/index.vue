<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-in">
      <TemplatesDialog
        v-if="placedAction"
        :field="placedAction.field"
        @close="placedAction = null"
        @submit="onAddTemplate"
      />
    </BlokkliTransition>
  </Teleport>

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <CreateTemplateDialog
        v-if="showCreateDialog && createTemplateUuids.length"
        :uuids="createTemplateUuids"
        @confirm="onCreateTemplateConfirm"
        @cancel="closeCreateDialog"
      />
    </BlokkliTransition>
  </Teleport>

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <ManageDialog
        v-if="showManageDialog"
        @cancel="showManageDialog = false"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, defineBlokkliFeature } from '#imports'
import TemplatesDialog from './Dialog/index.vue'
import CreateTemplateDialog from './CreateDialog/index.vue'
import ManageDialog from './ManageDialog/index.vue'
import { BlokkliTransition } from '#blokkli/editor/components'
import {
  defineAddAction,
  defineItemDropdownAction,
  defineMenuButton,
  useDialog,
} from '#blokkli/editor/composables'
import type { ActionPlacedData } from '#blokkli/editor/types/actions'

const { adapter } = defineBlokkliFeature({
  id: 'templates',
  icon: 'bk_mdi_dashboard',
  label: 'Templates',
  description: 'Add blocks from templates.',
  requiredAdapterMethods: ['templatesAdd', 'templatesSearch'],
  dependencies: ['add-list', 'entity-title'],
})

const { state, $t, ui, selection } = useBlokkli()

const placedAction = ref<ActionPlacedData | null>(null)
const createTemplateUuids = ref<string[]>([])
const showCreateDialog = useDialog('templates-create', 'center')
const showManageDialog = useDialog('templates-manage', 'center')

const onAddTemplate = async (templateUuid: string) => {
  if (!placedAction.value || !adapter.templatesAdd) {
    return
  }

  await state.mutateWithLoadingState(() =>
    adapter.templatesAdd!({
      templateUuid,
      host: placedAction.value!.host,
      afterUuid: placedAction.value!.preceedingUuid,
    }),
  )

  placedAction.value = null
}

function closeCreateDialog() {
  showCreateDialog.value = false
  createTemplateUuids.value = []
}

async function onCreateTemplateConfirm(
  label: string,
  description: string,
  isDefault: boolean,
) {
  if (!adapter.templatesCreate || !createTemplateUuids.value.length) {
    return
  }

  const isSuccess = await state.mutateWithLoadingState(
    () =>
      adapter.templatesCreate!({
        label,
        description: description || undefined,
        uuids: createTemplateUuids.value,
        isDefault: isDefault || undefined,
      }),
    $t('templatesCreateError', 'Failed to create template.'),
    $t(
      'templatesSuccessMessage',
      'Successfully created template "@label"',
    ).replace('@label', label),
  )

  if (isSuccess) {
    closeCreateDialog()
  }
}

function onCreateTemplate() {
  const uuids = selection.uuids.value
  if (!uuids.length) {
    return
  }

  // Filter out UUIDs that are children of other selected UUIDs.
  // For example, if both a grid and a card inside the grid are selected,
  // only the grid should remain.
  const filteredUuids = uuids.filter((uuid) => {
    return !uuids.some(
      (otherUuid) => otherUuid !== uuid && state.isChildOf(uuid, otherUuid),
    )
  })

  createTemplateUuids.value = filteredUuids
  showCreateDialog.value = true
}

defineAddAction(() => {
  return {
    id: 'template',
    icon: 'bk_mdi_dashboard',
    color: 'rose',
    title: $t('templatesAddTemplate', 'Template'),
    weight: 10,
    description: $t(
      'templatesAddTemplateDescription',
      '<p>Drag the icon into the page to add blocks from a template.</p><p>Templates are copied to your page and can be changed without affecting other pages.</p>',
    ),
    callback: (action: ActionPlacedData) => {
      placedAction.value = action
    },
  }
})

defineItemDropdownAction(() => {
  if (!selection.uuids.value.length || !adapter.templatesCreate) {
    return
  }
  return {
    id: 'templates-create',
    label: $t('templatesCreate', 'Create template...'),
    icon: 'bk_mdi_dashboard',
    group: 'templates',
    weight: 200,
    callback: () => {
      onCreateTemplate()
    },
  }
})

defineMenuButton(() => {
  if (!adapter.templatesDelete) {
    return
  }
  return {
    id: 'templates',
    title: $t('templatesMenuLabel', 'Templates...'),
    weight: -100,
    description: $t(
      'templatesMenuDescription',
      'Edit and delete block templates',
    ),
    icon: 'bk_mdi_dashboard',
    secondary: true,
    callback: () => {
      showManageDialog.value = true
    },
  }
})
</script>

<script lang="ts">
export default {
  name: 'Templates',
}
</script>
