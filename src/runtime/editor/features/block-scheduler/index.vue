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
        <Icon name="bk_mdi_calendar_month" class="bk-item-action-icon" />
        <Icon
          v-if="selectionHasDates"
          name="bk_mdi_check"
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
import { PluginItemAction } from '#blokkli/editor/plugins'
import { BlokkliTransition, Icon } from '#blokkli/editor/components'
import SchedulerDialog from './Dialog/index.vue'

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

<style lang="postcss">
.bk-block-scheduler-dialog {
  min-height: calc(100vh - 350px);
}

.bk-schedule-section-content {
  @apply pt-5 pb-25;
}

.bk-schedule-section-mixed {
  .bk-button {
    @apply mt-20;
  }
}

.bk-schedule-section {
  @apply border-b border-b-mono-300 first:border-t first:border-t-mono-300;
  > .bk-checkbox-toggle {
    @apply items-center py-15;
  }
}

.bk-schedule-section-toggle-title {
  @apply flex items-center mr-auto gap-10;
  .bk-icon {
    svg {
      @apply size-25 fill-current;
    }
  }
}

.bk-schedule-section-toggle-title-label {
  @apply font-bold text-xl;
}

.bk-block-scheduler-table {
  @apply bg-mono-100 mt-20 p-20 rounded-md border border-mono-300;

  table {
    @apply mt-20;
    thead {
      @apply bg-mono-100;
    }
  }
}

.bk-block-scheduler-table-title {
  @apply font-bold text-xl;
}

.bk-schedule-action-icon {
  @apply relative;
  .bk-schedule-action-icon-check {
    @apply absolute -top-5 -right-5;
    @apply size-15 bg-yellow-normal rounded-full flex items-center justify-center;

    svg {
      @apply size-10;
    }
  }
}

.bk-item-action.bk-has-schedule {
  @apply bg-yellow-dark/50 hover:bg-yellow-dark/70;

  .bk-icon-clock {
    @apply text-yellow-light;
  }
}
</style>
