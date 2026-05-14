<template>
  <div v-if="visible" class="p-panel-gap">
    <InfoBox
      v-if="status === 'pending'"
      small
      icon="spinner"
      color="teal"
      :text="$t('chartsDynamicPreviewLoading', 'Loading data from the source…')"
    />
    <InfoBox
      v-else-if="status === 'error'"
      small
      color="red"
      :text="errorText"
    />
    <InfoBox v-else-if="missing" small color="yellow" :text="missingText" />
    <InfoBox
      v-else-if="status === 'success' && empty"
      small
      color="yellow"
      :text="
        $t(
          'chartsDynamicPreviewEmpty',
          'The data source returned no rows or series.',
        )
      "
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { InfoBox } from '#blokkli/editor/components'
import type { AsyncDataRequestStatus } from '#app'

const props = defineProps<{
  status: AsyncDataRequestStatus
  error: Error | null
  /**
   * True when the currently-referenced source is no longer in the live
   * list returned by the adapter. The cached `label` is shown so the user
   * knows which source went missing.
   */
  missing: boolean
  missingLabel: string
  empty: boolean
}>()

const { $t } = useBlokkli()

const visible = computed(() => {
  if (props.status === 'pending' || props.status === 'error') return true
  if (props.missing) return true
  if (props.status === 'success' && props.empty) return true
  return false
})

const errorText = computed(() => {
  return (
    $t('chartsDynamicPreviewError', 'Failed to load data:') +
    ' ' +
    (props.error?.message ?? '')
  )
})

const missingText = computed(() =>
  $t(
    'chartsDynamicPreviewMissing',
    'Source no longer available (was: @label).',
  ).replace('@label', props.missingLabel || '—'),
)
</script>
