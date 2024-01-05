<template>
  <PluginMenuButton
    :title="$t('publishLabel')"
    :description="$t('publishDescription')"
    :disabled="!mutations.length || !canEdit"
    type="success"
    :weight="0"
    @click="onClick"
  >
    <Icon name="publish" />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { adapter } = defineBlokkliFeature({
  id: 'publish',
  icon: 'publish',
  label: 'Publish',
  requiredAdapterMethods: ['publish'],
  description:
    'Provides a menu button to publish the changes of the current entity.',
})

const { state, $t } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const onClick = async () => {
  await mutateWithLoadingState(
    adapter.publish(),
    $t('publishError'),
    $t('publishSuccess'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Publish',
}
</script>
