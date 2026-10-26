<template>
  <DialogModal
    id="block-scheduler"
    :title="$t('manageScheduling', 'Manage scheduling')"
    :submit-label="$t('blockSchedulerDialogSubmit', 'Save schedule')"
    :width="900"
    :lead="
      languageLabels
        ? $t(
            'blockSchedulerDialogLeadLanguages',
            'Schedule automatic publishing and unpublishing dates for the selected blocks. A date set here applies to all languages.',
          )
        : $t(
            'blockSchedulerDialogLead',
            'Schedule automatic publishing and unpublishing dates for the selected blocks.',
          )
    "
    :is-loading
    :can-submit
    mono
    @cancel="$emit('close')"
    @submit="onSubmit"
  >
    <div class="bk bk-block-scheduler-dialog">
      <ScheduleSection
        v-model="publishOn"
        test-id="scheduler-publish"
        icon="bk_mdi_visibility"
        :help="
          $t(
            'blockSchedulerDialogPublishOnHelp',
            'Pick a date and time when the selected blocks should automatically become visible to visitors. Until then, they remain unpublished.',
          )
        "
        :label="$t('blockSchedulerDialogPublishOn', 'Publish on')"
        :items="publishOnItems"
        :supported-bundles="bundlesWithPublish"
        :disabled="publishDisabled"
        :language-labels
        show-status
      />

      <ScheduleSection
        v-model="unpublishOn"
        test-id="scheduler-unpublish"
        icon="bk_mdi_visibility_off"
        :label="$t('blockSchedulerDialogUnpublishOn', 'Unpublish on')"
        :help="
          $t(
            'blockSchedulerDialogUnpublishOnHelp',
            'Pick a date and time when the selected blocks should automatically be hidden from visitors. After that, they will no longer be displayed on the page.',
          )
        "
        :items="unpublishOnItems"
        :supported-bundles="bundlesWithUnpublish"
        :disabled="unpublishDisabled"
        :language-labels
      />

      <PanelSection v-if="canSubmit" :title="$t('summary', 'Summary')">
        <table class="bk-table bk-padded">
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
      </PanelSection>
    </div>
  </DialogModal>
</template>

<script setup lang="ts">
import { falsy } from '#blokkli/helpers'
import { computed, useBlokkli, ref, watch } from '#imports'
import ScheduleSection from './ScheduleSection.vue'
import type { ScheduleItemData } from './ScheduleSection.vue'
import { DialogModal } from '#blokkli/editor/components'
import type { BlokkliAdapterSetBlockScheduleOptions } from '../types'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

const props = defineProps<{
  uuids: string[]
  bundlesWithPublish: string[]
  bundlesWithUnpublish: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { state, $t, adapter, ui, types, context } = useBlokkli()

const isLoading = ref(false)
const error = ref('')

const items = computed(() => {
  return props.uuids
    .map((uuid) => {
      return state.getFieldListItem(uuid)
    })
    .filter(falsy)
    .map((item) => {
      const isPublished = !!item.editContext?.isPublished
      const publishOn = item.editContext?.publishOn ?? null
      const unpublishOn = item.editContext?.unpublishOn ?? null
      return {
        uuid: item.uuid,
        bundle: item.bundle,
        // A backend that doesn't list them has the current language's.
        translations: item.editContext?.translations?.map((v) => ({
          ...v,
          publishOn: v.publishOn ?? null,
          unpublishOn: v.unpublishOn ?? null,
        })) ?? [
          {
            langcode: context.value.language,
            isPublished,
            publishOn,
            unpublishOn,
          },
        ],
      }
    })
})

/**
 * The names of the page's languages, by langcode, when it has several
 * translations: a schedule applies to all of them.
 */
const languageLabels = computed<Record<string, string> | null>(() => {
  const translations = state.translation.value.translations ?? []
  const languages = (state.translation.value.availableLanguages ?? []).filter(
    (language) => translations.some((v) => v.id === language.id && v.exists),
  )
  if (languages.length < 2) {
    return null
  }
  return Object.fromEntries(languages.map((v) => [v.id, v.name]))
})

type Item = (typeof items.value)[number]

/**
 * Whether a date differs from one of the block's translations: undefined means
 * no change.
 */
function isChanged(
  item: Item,
  key: 'publishOn' | 'unpublishOn',
  date: string | null | undefined,
): boolean {
  return date !== undefined && item.translations.some((v) => v[key] !== date)
}

/**
 * The block's current date, or that its translations differ.
 */
function formatCurrentDate(
  item: Item,
  key: 'publishOn' | 'unpublishOn',
): string {
  const dates = [...new Set(item.translations.map((v) => v[key]))]
  if (dates.length > 1) {
    return $t('blockSchedulerDiffersPerLanguage', 'Differs per language')
  }
  return dates[0] ? ui.formatDate(dates[0]) : $t('notSet', 'Not set')
}

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
  return items.value.flatMap((item) =>
    item.translations.map((v) => ({
      uuid: item.uuid,
      bundle: item.bundle,
      langcode: v.langcode,
      date: v.publishOn,
      isPublished: v.isPublished,
    })),
  )
})

const unpublishOnItems = computed<ScheduleItemData[]>(() => {
  return items.value.flatMap((item) =>
    item.translations.map((v) => ({
      uuid: item.uuid,
      bundle: item.bundle,
      langcode: v.langcode,
      date: v.unpublishOn,
    })),
  )
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
      publishOnDisplay = formatCurrentDate(item, 'publishOn')
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
      unpublishOnDisplay = formatCurrentDate(item, 'unpublishOn')
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

    return (
      (supportsPublish && isChanged(item, 'publishOn', publishOn.value)) ||
      (supportsUnpublish && isChanged(item, 'unpublishOn', unpublishOn.value))
    )
  })
})

async function onSubmit() {
  isLoading.value = true
  const blocks: BlokkliAdapterSetBlockScheduleOptions[] = []

  items.value.forEach((item) => {
    const supportsPublish = props.bundlesWithPublish.includes(item.bundle)
    const supportsUnpublish = props.bundlesWithUnpublish.includes(item.bundle)

    // A change that one of the translations doesn't have yet: the date is set
    // in every language.
    if (supportsPublish && isChanged(item, 'publishOn', publishOn.value)) {
      blocks.push({
        uuid: item.uuid,
        type: 'publish',
        date: publishOn.value || undefined,
      })
    }

    if (
      supportsUnpublish &&
      isChanged(item, 'unpublishOn', unpublishOn.value)
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

<style lang="postcss">
.bk.bk-block-scheduler-dialog {
  min-height: calc(100vh - 350px);
}
</style>
