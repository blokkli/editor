<template>
  <PluginMenuButton
    :title="text('publishLabel')"
    :description="text('publishDescription')"
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

const { state, adapter, text } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const onClick = async () => {
  await mutateWithLoadingState(
    adapter.publish(),
    text('publishError'),
    text('publishSuccess'),
  )
}
</script>
