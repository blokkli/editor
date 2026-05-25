<template>
  <PluginItemAction
    id="block-scheduler"
    :title="$t('manageSchedule', 'Manage schedule', { more: true })"
    :disabled
    multiple
    edit-only
    meta
    icon="bk_mdi_calendar_month"
    :weight="1000"
    @click="onClick"
  >
    <template #icon-addon>
      <div
        v-if="selectionHasDates"
        data-test="block-scheduler-indicator"
        class="absolute -top-5 -right-5 size-15 bg-yellow-normal rounded-full flex items-center justify-center text-yellow-dark"
      >
        <Icon name="bk_mdi_check" class="size-10" />
      </div>
    </template>
  </PluginItemAction>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <SchedulerDialog
        v-if="isVisible"
        :uuids="selectedUuids"
        :bundles-with-publish="bundlesWithPublish"
        :bundles-with-unpublish="bundlesWithUnpublish"
        @close="onClose"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  ref,
  defineAsyncComponent,
} from '#imports'
import { PluginItemAction } from '#blokkli/editor/plugins'
import { BlokkliTransition, Icon } from '#blokkli/editor/components'

const SchedulerDialog = defineAsyncComponent(() => import('./Dialog/index.vue'))

defineBlokkliFeature({
  id: 'block-scheduler',
  icon: 'bk_mdi_calendar_month',
  label: 'Block Scheduler',
  description: 'Adds support for scheduling blocks.',
  requiredAdapterMethods: ['setBlockScheduleDate'],
})

const { $t, state, selection, types, ui } = useBlokkli()

const bundlesWithPublish = computed(() =>
  types.generallyAvailableBundles
    .filter((v) => v.hasPublishOn)
    .map((v) => v.id),
)
const bundlesWithUnpublish = computed(() =>
  types.generallyAvailableBundles
    .filter((v) => v.hasUnpublishOn)
    .map((v) => v.id),
)

const selectedUuids = ref<string[]>([])

const isVisible = computed<boolean>(() => {
  return !!selectedUuids.value.length
})

const selectionHasDates = computed<boolean>(() => {
  for (let i = 0; i < selection.uuids.value.length; i++) {
    const uuid = selection.uuids.value[i]
    if (!uuid) {
      continue
    }

    const block = state.getFieldListItem(uuid)
    if (!block) {
      continue
    }

    if (block.editContext?.publishOn || block.editContext?.unpublishOn) {
      return true
    }
  }

  return false
})

const disabled = computed<false | string>(() => {
  const hasSupport = selection.bundles.value.some(
    (bundle) =>
      bundlesWithPublish.value.includes(bundle) ||
      bundlesWithUnpublish.value.includes(bundle),
  )
  if (!hasSupport) {
    return $t(
      'schedulerNotSupported',
      'Scheduling is not available for this block type.',
    )
  }
  return false
})

function onClick() {
  selectedUuids.value = [...selection.uuids.value]
}

function onClose() {
  selectedUuids.value = []
}
</script>

<script lang="ts">
export default {
  name: 'BlockScheduler',
}
</script>
