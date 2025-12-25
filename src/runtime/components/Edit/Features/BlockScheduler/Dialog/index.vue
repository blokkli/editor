<template>
  <DialogModal
    id="block-scheduler"
    :title="$t('blockSchedulerDialogTitle', 'Manage scheduling')"
    :submit-label="$t('blockSchedulerDialogSubmit', 'Save schedule')"
    :width="900"
    :lead="
      $t(
        'blockSchedulerDialogLead',
        'Schedule automatic publishing and unpublishing dates for the selected blocks.',
      )
    "
    :is-loading
    :can-submit
    @cancel="$emit('close')"
    @submit="onSubmit"
  >
    <div class="bk-block-scheduler-dialog">
      <ScheduleSection
        v-model="publishOn"
        icon="bk_mdi_visibility"
        :label="$t('blockSchedulerDialogPublishOn', 'Publish on')"
        :items="publishOnItems"
        :supported-bundles="bundlesWithPublish"
        :disabled="publishDisabled"
      />

      <ScheduleSection
        v-model="unpublishOn"
        icon="bk_mdi_visibility_off"
        :label="$t('blockSchedulerDialogUnpublishOn', 'Unpublish on')"
        :items="unpublishOnItems"
        :supported-bundles="bundlesWithUnpublish"
        :disabled="unpublishDisabled"
      />

      <div class="bk-block-scheduler-table">
        <h3 class="bk-block-scheduler-table-title">
          <span v-if="canSubmit">{{
            $t('blockSchedulerChangesPreview', 'Changes to be applied')
          }}</span>
          <span v-else>
            {{ $t('blockSchedulerNoChanges', 'No changes to be applied.') }}
          </span>
        </h3>
        <table v-if="canSubmit" class="bk-table">
          <thead>
            <tr>
              <th>{{ $t('bundle', 'Bundle') }}</th>
              <th>{{ $t('blockSchedulerDialogPublishOn', 'Publish on') }}</th>
              <th>
                {{ $t('blockSchedulerDialogUnpublishOn', 'Unpublish on') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in tableRows" :key="index">
              <td>{{ row.bundle }}</td>
              <td>{{ row.publishOn }}</td>
              <td>{{ row.unpublishOn }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </DialogModal>
</template>

<script setup lang="ts">
import type { BlokkliAdapterSetBlockScheduleOptions } from '#blokkli/adapter'
import { falsy } from '#blokkli/helpers'
import { computed, useBlokkli, ref, watch } from '#imports'
import ScheduleSection from './ScheduleSection.vue'
import type { ScheduleItemData } from './ScheduleSection.vue'
import { DialogModal } from '#blokkli/components'

const props = defineProps<{
  uuids: string[]
  bundlesWithPublish: string[]
  bundlesWithUnpublish: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { state, $t, adapter, ui, types } = useBlokkli()

const isLoading = ref(false)
const error = ref('')

const items = computed(() => {
  return props.uuids
    .map((uuid) => {
      return state.getFieldListItem(uuid)
    })
    .filter(falsy)
    .map((item) => {
      return {
        uuid: item.uuid,
        bundle: item.bundle,
        isPublished: !!item.editContext?.isPublished,
        publishOn: item.editContext?.publishOn,
        unpublishOn: item.editContext?.unpublishOn,
      }
    })
})

const selectedBundles = computed(() => {
  const bundles = items.value.map((item) => item.bundle)
  return [...new Set(bundles)]
})

const publishDisabled = computed(() => {
  return !selectedBundles.value.some((bundle) =>
    props.bundlesWithPublish.includes(bundle),
  )
})

const unpublishDisabled = computed(() => {
  return !selectedBundles.value.some((bundle) =>
    props.bundlesWithUnpublish.includes(bundle),
  )
})

const publishOnItems = computed<ScheduleItemData[]>(() => {
  return items.value.map((item) => ({
    uuid: item.uuid,
    bundle: item.bundle,
    date: item.publishOn,
  }))
})

const unpublishOnItems = computed<ScheduleItemData[]>(() => {
  return items.value.map((item) => ({
    uuid: item.uuid,
    bundle: item.bundle,
    date: item.unpublishOn,
  }))
})

// Helper function to get common date from supported items
// Returns the common date if all have the same, undefined if mixed
function getCommonDate(
  items: typeof publishOnItems.value,
  supportedBundles: string[],
): string | null | undefined {
  const supportedItems = items.filter((item) =>
    supportedBundles.includes(item.bundle),
  )

  if (supportedItems.length === 0) {
    return undefined
  }

  const dates = supportedItems.map((item) => item.date)

  // If all dates are null, return null
  if (dates.every((date) => date == null)) {
    return null
  }

  // Check if all dates are the same
  const firstDate = dates[0]
  const allSame = dates.every((date) => date === firstDate)

  // Return undefined if mixed (means no initial value, don't submit changes)
  // Return the common date if all the same
  return allSame ? (firstDate ?? null) : undefined
}

// Initialize publishOn and unpublishOn with common dates if they exist
// undefined means mixed/no initial value - won't submit unless changed by user
const publishOn = ref<string | null | undefined>(
  getCommonDate(publishOnItems.value, props.bundlesWithPublish),
)
const unpublishOn = ref<string | null | undefined>(
  getCommonDate(unpublishOnItems.value, props.bundlesWithUnpublish),
)

watch(
  () => [publishOn.value, unpublishOn.value],
  () => {
    ui.requireDialogCloseConfirm()
  },
  {
    once: true,
  },
)

const tableRows = computed(() => {
  return items.value.map((item) => {
    const bundleDef = types.getBlockBundleDefinition(item.bundle)
    const supportsPublish = props.bundlesWithPublish.includes(item.bundle)
    const supportsUnpublish = props.bundlesWithUnpublish.includes(item.bundle)

    let publishOnDisplay: string
    if (!supportsPublish) {
      publishOnDisplay = $t('notSupported', 'Not supported')
    } else if (publishOn.value === undefined) {
      // undefined = no change, show current value
      publishOnDisplay = item.publishOn
        ? ui.formatDate(item.publishOn)
        : $t('notSet', 'Not set')
    } else if (publishOn.value) {
      publishOnDisplay = ui.formatDate(publishOn.value)
    } else {
      publishOnDisplay = $t('notSet', 'Not set')
    }

    let unpublishOnDisplay: string
    if (!supportsUnpublish) {
      unpublishOnDisplay = $t('notSupported', 'Not supported')
    } else if (unpublishOn.value === undefined) {
      // undefined = no change, show current value
      unpublishOnDisplay = item.unpublishOn
        ? ui.formatDate(item.unpublishOn)
        : $t('notSet', 'Not set')
    } else if (unpublishOn.value) {
      unpublishOnDisplay = ui.formatDate(unpublishOn.value)
    } else {
      unpublishOnDisplay = $t('notSet', 'Not set')
    }

    return {
      bundle: bundleDef?.label || item.bundle,
      publishOn: publishOnDisplay,
      unpublishOn: unpublishOnDisplay,
    }
  })
})

const canSubmit = computed(() => {
  return items.value.some((item) => {
    const supportsPublish = props.bundlesWithPublish.includes(item.bundle)
    const supportsUnpublish = props.bundlesWithUnpublish.includes(item.bundle)

    // Check if publishOn changed for bundles that support it
    // Only consider it a change if value is not undefined
    if (
      supportsPublish &&
      publishOn.value !== undefined &&
      item.publishOn !== publishOn.value
    ) {
      return true
    }

    // Check if unpublishOn changed for bundles that support it
    // Only consider it a change if value is not undefined
    if (
      supportsUnpublish &&
      unpublishOn.value !== undefined &&
      item.unpublishOn !== unpublishOn.value
    ) {
      return true
    }

    return false
  })
})

async function onSubmit() {
  isLoading.value = true
  const blocks: BlokkliAdapterSetBlockScheduleOptions[] = []

  items.value.forEach((item) => {
    const supportsPublish = props.bundlesWithPublish.includes(item.bundle)
    const supportsUnpublish = props.bundlesWithUnpublish.includes(item.bundle)

    // Only submit publishOn changes if value is not undefined (undefined = no change made)
    if (
      supportsPublish &&
      publishOn.value !== undefined &&
      item.publishOn !== publishOn.value
    ) {
      blocks.push({
        uuid: item.uuid,
        type: 'publish',
        date: publishOn.value || undefined,
      })
    }

    // Only submit unpublishOn changes if value is not undefined (undefined = no change made)
    if (
      supportsUnpublish &&
      unpublishOn.value !== undefined &&
      item.unpublishOn !== unpublishOn.value
    ) {
      blocks.push({
        uuid: item.uuid,
        type: 'unpublish',
        date: unpublishOn.value || undefined,
      })
    }
  })

  isLoading.value = true

  const isSuccess = await state.mutateWithLoadingState(
    () => adapter.setBlockScheduleDate!(blocks),
    false,
    $t('blockSchedulerSuccessMessage', 'Successfully updated schedule dates.'),
  )

  if (!isSuccess) {
    error.value = 'An unexpected error happened.'
    return
  }

  emit('close')
}
</script>
