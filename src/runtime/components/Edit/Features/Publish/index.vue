<template>
  <PluginMenuButton
    id="publish"
    :title="publishLabel"
    :description="publishDescription"
    :disabled="!mutations.length || !canEdit"
    type="success"
    :weight="0"
    :icon="icon"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed, useRoute } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import type { BlokkliIcon } from '#blokkli/icons'

const { adapter, settings } = defineBlokkliFeature({
  id: 'publish',
  icon: 'publish',
  label: 'Publish',
  requiredAdapterMethods: ['publish'],
  description:
    'Provides a menu button to publish the changes of the current entity.',
  settings: {
    closeAfterPublish: {
      type: 'checkbox',
      label: 'Close editor after publishing',
      default: true,
      group: 'behavior',
    },
  },
})

const route = useRoute()
const { state, $t, eventBus, broadcast, context } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const isPublished = computed<boolean>(() => !!state.entity.value.status)

const publishLabel = computed(() => {
  // Entity is published. Clicking the button will make the changes go "live".
  if (isPublished.value) {
    return settings.value.closeAfterPublish
      ? $t('publishAndCloseLabel', 'Publish & Close')
      : $t('publishLabel', 'Publish')
  }

  return settings.value.closeAfterPublish
    ? $t('publishAndCloseLabelUnpublished', 'Save & Close')
    : $t('publishLabelUnpublished', 'Save')
})

const publishDescription = computed(() =>
  isPublished.value
    ? $t('publishDescription', 'Publish all changes.')
    : $t(
        'publishDescriptionUnpublished',
        'Save all changes while keeping page unpublished',
      ),
)

const icon = computed<BlokkliIcon>(() =>
  isPublished.value ? 'publish' : 'save',
)

const onClick = async () => {
  const success = await mutateWithLoadingState(
    adapter.publish,
    $t('publishError', 'Changes could not be published.'),
    $t('publishSuccess', 'Changes published successfully.'),
  )

  if (!success) {
    const validations = state.violations.value
    if (validations.length) {
      eventBus.emit('publish:failed')
    }
    return
  }

  broadcast.emit('published', { uuid: context.value.entityUuid })

  if (settings.value.closeAfterPublish) {
    window.location.href = route.path
  }
}
</script>

<script lang="ts">
export default {
  name: 'Publish',
}
</script>
