<template>
  <PluginMenuButton
    title="Verwerfen..."
    description="Aktuell veröffentlichter Zustand Wiederherstellen"
    type="danger"
    @click="showConfirm = true"
    :disabled="!mutations.length || !canEdit"
    :weight="10"
  >
    <Icon name="revert" />
  </PluginMenuButton>

  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <DialogModal
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
import { PluginMenuButton } from '#blokkli/plugins'
import { Icon, DialogModal } from '#blokkli/components'

const { adapter, state } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const showConfirm = ref(false)

async function onSubmit() {
  await mutateWithLoadingState(
    adapter.revertAllChanges(),
    'Änderungen konnten nicht verworfen werden.',
    'Alle Änderungen wurden verworfen.',
  )
  showConfirm.value = false
}
</script>
