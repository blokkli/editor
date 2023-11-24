<template>
  <PluginMenuButton
    title="Veröffentlichen und Schliessen"
    description="Alle Änderungen öffentlich machen"
    @click="onClick"
    :disabled="!mutations.length || !canEdit"
    type="success"
    :weight="0"
  >
    <Icon />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import Icon from './../../Icons/Publish.vue'

const { mutations, canEdit, mutateWithLoadingState, adapter, eventBus } =
  useParagraphsBuilderStore()

const onClick = async () => {
  await mutateWithLoadingState(
    adapter.publish(),
    'Änderungen konnten nicht publiziert werden.',
    'Änderungen erfolgreich publiziert.',
  )
  eventBus.emit('exitEditor')
}
</script>
