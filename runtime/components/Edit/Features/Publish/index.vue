<template>
  <PluginMenuButton
    title="Veröffentlichen"
    description="Alle Änderungen öffentlich machen"
    @click="onClick"
    :disabled="!mutations.length || !canEdit"
    type="success"
    :weight="0"
  >
    <Icon name="publish" />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import { PluginMenuButton } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { state, adapter } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const onClick = async () => {
  await mutateWithLoadingState(
    adapter.publish(),
    'Änderungen konnten nicht publiziert werden.',
    'Änderungen erfolgreich publiziert.',
  )
}
</script>
