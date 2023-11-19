<template>
  <PluginMenuButton
    title="Verwerfen..."
    description="Aktuell veröffentlichter Zustand Wiederherstellen"
    type="danger"
    @click="showConfirm = true"
    :disabled="!mutations.length || !canEdit"
  >
    <Icon />
  </PluginMenuButton>

  <Teleport to="body">
    <transition appear name="pb-slide-up" :duration="900">
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

const { eventBus, mutations, canEdit } = useParagraphsBuilderStore()

const showConfirm = ref(false)

function onSubmit() {
  eventBus.emit('closeMenu')
  eventBus.emit('revertAllChanges')
}
</script>
