<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <PublishDialog v-if="showDialog" @close="onClose" @submit="onSubmit" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  useRoute,
  nextTick,
} from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { BlokkliTransition } from '#blokkli/components'
import PublishDialog from './Dialog/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineMenuButton from '#blokkli/helpers/composables/defineMenuButton'
import { useDialog } from '#blokkli/helpers/composables/useDialog'

const { adapter, settings } = defineBlokkliFeature({
  id: 'publish',
  icon: 'bk_mdi_publish',
  label: 'Publish',
  requiredAdapterMethods: ['publish'],
  description:
    'Provides a menu button to publish the changes of the current entity.',
  settings: {
    closeAfterPublish: {
      type: 'checkbox',
      label: 'Close editor after publishing',
      description:
        'Immediately closes the editor after successfully publishing or saving.',
      default: true,
      group: 'behavior',
    },
  },
})

const route = useRoute()
const { state, $t, broadcast, context, eventBus, ui } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const hasPublishOptions = !!adapter.getPublishOptions

const isPublished = computed<boolean>(() => !!state.entity.value.status)

const isScheduled = computed<boolean>(
  () => !!state.publishOptions.value.publishOn,
)

const showDialog = useDialog('publish', 'center')

const publishLabel = computed(() => {
  const suffix = hasPublishOptions ? '...' : ''

  // Check if there's a scheduled publication
  if (isScheduled.value) {
    return $t('publishManageSchedule', 'Manage scheduling') + suffix
  }

  // Entity is published. Clicking the button will make the changes go "live".
  if (isPublished.value) {
    return (
      (settings.value.closeAfterPublish
        ? $t('publishAndCloseLabel', 'Publish & Close')
        : $t('publishLabel', 'Publish')) + suffix
    )
  }

  return (
    (settings.value.closeAfterPublish
      ? $t('publishAndCloseLabelUnpublished', 'Save & Close')
      : $t('publishLabelUnpublished', 'Save')) + suffix
  )
})

const publishDescription = computed(() => {
  if (isScheduled.value) {
    return $t(
      'publishDescriptionScheduled',
      'View or change the scheduled publication',
    )
  }
  return isPublished.value
    ? $t('publishDescription', 'Publish all changes.')
    : $t(
        'publishDescriptionUnpublished',
        'Save all changes while keeping page unpublished',
      )
})

const icon = computed<BlokkliIcon>(() => {
  if (state.publishOptions.value?.publishOn) {
    return 'bk_mdi_calendar_clock'
  }
  return isPublished.value ? 'bk_mdi_publish' : 'bk_mdi_save'
})

const onMenuClick = async () => {
  if (hasPublishOptions) {
    showDialog.value = true
    return
  }

  await publishCurrent()
}

async function publishCurrent() {
  const success = await mutateWithLoadingState(
    () =>
      adapter.publish({
        hostEntityType: context.value.entityType,
        hostEntityUuid: context.value.entityUuid,
        closeAfterPublish: settings.value.closeAfterPublish,
      }),
    $t('publishError', 'Changes could not be published.'),
    $t('publishSuccess', 'Changes published successfully.'),
  )

  if (!success) {
    const validations = state.violations.value
    if (validations.length) {
      eventBus.emit('publish:failed')
      // Open the validations sidebar when there are validation errors.
      eventBus.emit('sidebar:open', 'violations')
    }
    return
  }

  onSubmit()
}

function onSubmit() {
  broadcast.emit('published', { uuid: context.value.entityUuid })

  if (settings.value.closeAfterPublish) {
    window.location.href = route.path
  }
}

async function onClose() {
  await nextTick()
  showDialog.value = false
}

onBlokkliEvent('publish:show-dialog', () => {
  showDialog.value = true
})

defineMenuButton(() => {
  return {
    id: 'publish',
    title: publishLabel.value,
    description: publishDescription.value,
    icon: icon.value,
    type: isScheduled.value ? 'yellow' : 'success',
    disabled: !mutations.value.length || !canEdit.value,
    weight: 0,
    callback: onMenuClick,
  }
})
</script>

<script lang="ts">
export default {
  name: 'Publish',
}
</script>
