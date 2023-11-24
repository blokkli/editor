<template>
  <PluginMenuButton
    v-if="mutatedFields.length"
    title="Importieren..."
    description="Von einer bestehenden Seite importieren"
    @click="showModal = true"
    :disabled="editMode !== 'editing'"
  >
    <Icon />
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
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import Icon from './../../Icons/Import.vue'
import ExistingDialog from './Dialog/index.vue'

const {
  eventBus,
  editMode,
  mutatedFields,
  adapter,
  mutateWithLoadingState,
  mutations,
  settings,
} = useParagraphsBuilderStore()

const hasNoParagraphs = computed(
  () => !mutatedFields.value.find((v) => v.field.list?.length),
)

const showModal = ref(false)

function onSubmit(sourceUuid: string, sourceFields: string[]) {
  showModal.value = false
  eventBus.emit('closeMenu')
  mutateWithLoadingState(
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
    !mutations.value.length &&
    settings.value.showImport
  ) {
    showModal.value = true
  }
})
</script>
