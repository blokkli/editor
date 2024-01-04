<template>
  <PluginMenuButton
    v-if="state.mutatedFields.value.length"
    :title="$t('importExistingTitle')"
    :description="$t('importExistingDescription')"
    :disabled="state.editMode.value !== 'editing'"
    :weight="50"
    @click="showModal = true"
  >
    <Icon name="import" />
  </PluginMenuButton>

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
import { Icon } from '#blokkli/components'
import ExistingDialog from './Dialog/index.vue'

const { adapter } = defineBlokkliFeature({
  id: 'import-existing',
  requiredAdapterMethods: ['getImportItems', 'importFromExisting'],
  description:
    'Implements a menu action that renders a dialog to import blocks from another entity.',
})

const { storage, state, $t } = useBlokkli()

const shouldOpen = storage.use('showImport', true)

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
    $t('importExistingError'),
    $t('importExistingSuccess'),
  )
}

onMounted(() => {
  // Show the import dialog when there are no items yet and no mutations.
  if (isEmpty.value && !state.mutations.value.length && shouldOpen.value) {
    showModal.value = true
  }
})
</script>

<script lang="ts">
export default {
  name: 'ImportExisting',
}
</script>
