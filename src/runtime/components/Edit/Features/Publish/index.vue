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

const { state, $t, eventBus } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const onClick = async () => {
  const success = await mutateWithLoadingState(
    adapter.publish(),
    $t('publishError', 'Changes could not be published.'),
    $t('publishSuccess', 'Changes published successfully.'),
  )

  if (!success) {
    const validations = state.violations.value
    if (validations.length) {
      eventBus.emit('publish:failed')
    }
  }
}
</script>

<script lang="ts">
export default {
  name: 'Publish',
}
</script>
