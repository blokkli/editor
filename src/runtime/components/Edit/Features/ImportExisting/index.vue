<template>
  <PluginMenuButton
    v-if="state.mutatedFields.value.length"
    id="import_existing"
    :title="$t('importExistingTitle', 'Import...')"
    :description="
      $t('importExistingDescription', 'Import from an existing page')
    "
    :disabled="state.editMode.value !== 'editing'"
    :weight="50"
    icon="import"
    @click="showModal = true"
  />

  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <ExistingDialog
        v-if="showModal"
        @confirm="onSubmit($event.sourceUuid, $event.fields)"
        @cancel="showModal = false"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  defineBlokkliFeature,
} from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import ExistingDialog from './Dialog/index.vue'

const { adapter, settings } = defineBlokkliFeature({
  id: 'import-existing',
  label: 'Import existing content',
  icon: 'import',
  requiredAdapterMethods: ['getImportItems', 'importFromExisting'],
  description:
    'Implements a menu action that renders a dialog to import blocks from another entity.',

  settings: {
    showDialogWhenEmpty: {
      type: 'checkbox',
      default: true,
      label: 'Show import dialog at start when page is empty',
      group: 'behavior',
    },
  },
})

const { state, $t } = useBlokkli()

const isEmpty = computed(
  () => !state.mutatedFields.value.find((v) => v.list?.length),
)

const showModal = ref(false)

function onSubmit(sourceUuid: string, sourceFields: string[]) {
  showModal.value = false
  state.mutateWithLoadingState(
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
    settings.value.showDialogWhenEmpty
  ) {
    showModal.value = true
  }
})
</script>

<script lang="ts">
export default {
  name: 'ImportExisting',
}
</script>
