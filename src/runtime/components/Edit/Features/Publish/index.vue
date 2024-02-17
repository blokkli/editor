<template>
  <PluginMenuButton
    id="publish"
    :title="$t('publishLabel', 'Publish')"
    :description="$t('publishDescription', 'Make all changes public')"
    :disabled="!mutations.length || !canEdit"
    type="success"
    :weight="0"
    icon="publish"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'

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
    $t('publishError', 'Changes could not be published.'),
    $t('publishSuccess', 'Changes published successfully.'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Publish',
}
</script>
