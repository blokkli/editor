<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <ExistingDialog
        v-if="showModal"
        :fields
        @confirm="onSubmit($event.sourceUuid, $event.fields)"
        @cancel="showModal = false"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  onMounted,
  defineBlokkliFeature,
  defineAsyncComponent,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import { defineMenuButton, useDialog } from '#blokkli/editor/composables'
import type { FieldConfig } from '#blokkli/editor/types/definitions'

const ExistingDialog = defineAsyncComponent(() => import('./Dialog/index.vue'))

const { adapter, settings } = defineBlokkliFeature({
  id: 'import-existing',
  label: 'Import existing content',
  icon: 'bk_mdi_arrow_downward',
  requiredAdapterMethods: ['getHostEntities', 'importFromExisting'],
  description:
    'Implements a menu action that renders a dialog to import blocks from another entity.',

  settings: {
    showDialogWhenEmpty: {
      type: 'checkbox',
      default: false,
      label: 'Show import dialog at start',
      description:
        'Displays the import dialog when starting blökkli if the page is empty.',
      group: 'behavior',
    },
  },
})

const { ui, state, $t, types, context } = useBlokkli()

const isEmpty = computed(
  () => !state.mutatedFields.value.find((v) => v.list?.length),
)

const showModal = useDialog('import-existing', 'center')

const fields = computed<FieldConfig[]>(() =>
  types.fieldConfig.forEntityTypeAndBundle(
    context.value.entityType,
    context.value.entityBundle,
  ),
)

function onSubmit(sourceUuid: string, sourceFields: string[]) {
  showModal.value = false
  state.mutateWithLoadingState(
    () =>
      adapter.importFromExisting({
        sourceFields,
        sourceUuid,
      }),
    $t('importExistingError', 'Content could not be imported.'),
    $t('importExistingSuccess', 'Content imported successfully.'),
  )
}

onMounted(() => {
  // Show the import dialog when there are no items yet and no mutations.
  if (
    isEmpty.value &&
    !state.mutations.value.length &&
    settings.value.showDialogWhenEmpty &&
    state.canEdit.value
  ) {
    showModal.value = true
  }
})

defineMenuButton(() => {
  // Only show the button if there are actually fields to import from.
  if (!fields.value.length) {
    return undefined
  }

  return {
    id: 'import_existing',
    title: $t('import', 'Import', { more: true }),
    description: $t(
      'importExistingDescription',
      'Import from an existing page',
    ),
    icon: 'bk_mdi_arrow_downward',
    disabled: state.editMode.value !== 'editing',
    weight: 50,
    callback: () => {
      showModal.value = true
    },
  }
})
</script>

<script lang="ts">
export default {
  name: 'ImportExisting',
}
</script>
