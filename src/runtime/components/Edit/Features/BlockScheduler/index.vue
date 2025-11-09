<template>
  <PluginItemAction
    id="block-scheduler"
    :title="$t('manageSchedule', 'Manage schedule...')"
    :disabled
    multiple
    edit-only
    meta
    :weight="1000"
    :class="{
      'bk-has-schedule': selectionHasDates,
    }"
    @click="onClick"
  >
    <template #icon>
      <div class="bk-schedule-action-icon">
        <Icon name="calendar" class="bk-item-action-icon" />
        <Icon
          v-if="selectionHasDates"
          name="check"
          class="bk-schedule-action-icon-check"
        />
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
import { useBlokkli, defineBlokkliFeature, computed, ref } from '#imports'
import { PluginItemAction } from '#blokkli/plugins'
import { BlokkliTransition, Icon } from '#blokkli/components'
import SchedulerDialog from './Dialog/index.vue'

defineBlokkliFeature({
  id: 'block-scheduler',
  icon: 'calendar',
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

const disabled = computed(() => {
  // Disable if none of the selected bundles support either publish or unpublish
  const hasSupport = selection.bundles.value.some(
    (bundle) =>
      bundlesWithPublish.value.includes(bundle) ||
      bundlesWithUnpublish.value.includes(bundle),
  )
  return !hasSupport
})

function onClick() {
  selectedUuids.value = [...selection.uuids.value]
}

function onClose() {
  console.log('ON CLOSE')
  selectedUuids.value = []
}
</script>

<script lang="ts">
export default {
  name: 'BlockScheduler',
}
</script>
