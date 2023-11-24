<template>
  <PluginMenuButton
    title="Verwerfen..."
    description="Aktuell veröffentlichter Zustand Wiederherstellen"
    type="danger"
    @click="showConfirm = true"
    :disabled="!mutations.length || !canEdit"
    :weight="10"
  >
    <Icon />
  </PluginMenuButton>

  <Teleport to="body">
    <transition appear name="pb-slide-up">
      <PbDialog
        v-if="showConfirm"
        title="Änderungen unwiderruflich verwerfen"
        lead="Damit werden alle Änderungen gelöscht und der aktuell publizierte Stand wiederhergestellt. Diese Aktion kann nicht rückgängig gemacht werden."
        submit-label="Änderungen verwerfen"
        is-danger
        @submit="onSubmit"
        @cancel="showConfirm = false"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import Icon from './../../Icons/Revert.vue'
import PbDialog from './../../Dialog/index.vue'

const { eventBus, mutations, canEdit, adapter, mutateWithLoadingState } =
  useParagraphsBuilderStore()

const showConfirm = ref(false)

async function onSubmit() {
  eventBus.emit('closeMenu')
  await mutateWithLoadingState(
    adapter.revertAllChanges(),
    'Änderungen konnten nicht verworfen werden.',
    'Alle Änderungen wurden verworfen.',
  )
  showConfirm.value = false
}
</script>
