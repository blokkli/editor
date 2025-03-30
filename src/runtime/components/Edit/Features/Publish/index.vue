<template>
  <PluginMenuButton
    id="publish"
    :title="publishLabel"
    :description="publishDescription"
    :disabled="!mutations.length || !canEdit"
    type="success"
    :weight="0"
    :icon="icon"
    @click="onMenuClick"
  />
  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <PublishDialog
        v-if="showDialog"
        v-model:states="additionalEditStates"
        v-model:revision-message="revisionMessage"
        v-model:should-publish="shouldPublish"
        @close="showDialog = false"
        @submit="onSubmit"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  useRoute,
  ref,
} from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import type { BlokkliIcon } from '#blokkli-build/icons'
import PublishDialog from './Dialog/index.vue'

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
      description:
        'Immediately closes the editor after successfully publishing or saving.',
      default: true,
      group: 'behavior',
    },
  },
})

const route = useRoute()
const { state, $t, eventBus, broadcast, context } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const hasPublishOptions = !!adapter.getPublishOptions

const isPublished = computed<boolean>(() => !!state.entity.value.status)

const showDialog = ref(true)

const additionalEditStates = ref<string[]>([])
const shouldPublish = ref(!!state.entity.value.status)
const revisionMessage = ref('')

const publishLabel = computed(() => {
  const suffix = hasPublishOptions ? '...' : ''
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

  broadcast.emit('published', { uuid: context.value.entityUuid })

  if (settings.value.closeAfterPublish) {
    window.location.href = route.path
  }
}

function onSubmit() {}
</script>

<script lang="ts">
export default {
  name: 'Publish',
}
</script>
