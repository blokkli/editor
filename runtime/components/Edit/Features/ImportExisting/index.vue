<template>
  <PluginMenuButton
    v-if="state.mutatedFields.value.length"
    title="Importieren..."
    description="Von einer bestehenden Seite importieren"
    @click="showModal = true"
    :disabled="state.editMode.value !== 'editing'"
    :weight="50"
  >
    <Icon name="import" />
  </PluginMenuButton>

  <Teleport to="body">
    <transition appear name="pb-slide-up">
      <ExistingDialog
        v-if="showModal"
        @confirm="onSubmit($event.sourceUuid, $event.fields)"
        @cancel="showModal = false"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { PluginMenuButton } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'
import ExistingDialog from './Dialog/index.vue'

const { adapter, storage, state } = useBlokkli()

const shouldOpen = storage.use('showImport', true)

const hasNoParagraphs = computed(
  () => !state.mutatedFields.value.find((v) => v.field.list?.length),
)

const showModal = ref(false)

function onSubmit(sourceUuid: string, sourceFields: string[]) {
  showModal.value = false
  state.mutateWithLoadingState(
    adapter.importFromExisting({
      sourceFields,
      sourceUuid,
    }),
    'Inhalte konnten nicht übernommen werden.',
    'Inhalte erfolgreich übernommen.',
  )
}

onMounted(() => {
  // Show the import dialog when there are no paragraphs yet and no mutations.
  if (
    hasNoParagraphs.value &&
    !state.mutations.value.length &&
    shouldOpen.value
  ) {
    showModal.value = true
  }
})
</script>
