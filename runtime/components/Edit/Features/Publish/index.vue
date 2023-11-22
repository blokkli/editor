<template>
  <PluginMenuButton
    title="Veröffentlichen"
    description="Alle Änderungen öffentlich machen"
    @click="onClick"
    :disabled="!mutations.length || !canEdit"
    type="success"
  >
    <Icon />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import Icon from './../../Icons/Publish.vue'

const { mutations, canEdit, mutateWithLoadingState, adapter } =
  useParagraphsBuilderStore()

const onClick = () =>
  mutateWithLoadingState(
    adapter.publish(),
    'Änderungen konnten nicht publiziert werden.',
    'Änderungen erfolgreich publiziert.',
  )
</script>
