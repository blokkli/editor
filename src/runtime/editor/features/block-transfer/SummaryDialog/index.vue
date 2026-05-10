<template>
  <DialogModal
    id="block-transfer-summary"
    :title="$t('blockTransferSummaryTitle', 'Import summary')"
    :submit-label="$t('blockTransferSummaryClose', 'Close')"
    :width="700"
    :lead="leadText"
    mono
    @cancel="$emit('close')"
    @submit="$emit('close')"
  >
    <div class="bk flex flex-col gap-20">
      <PanelSection
        v-if="summary.skippedBundles.length"
        :title="$t('blockTransferSkippedBundles', 'Skipped block types')"
        :help="
          $t(
            'blockTransferSkippedBundlesHelp',
            'These block types were not imported because they don’t exist on the target site or you don’t have permission to use them.',
          )
        "
        padded
      >
        <table class="bk-table">
          <thead>
            <tr>
              <th>{{ $t('bundle', 'Bundle') }}</th>
              <th class="text-right!">
                {{ $t('blockTransferCount', 'Count') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.skippedBundles" :key="row.bundle">
              <td>
                <code>{{ row.bundle }}</code>
              </td>
              <td class="text-right!">{{ row.count }}</td>
            </tr>
          </tbody>
        </table>
      </PanelSection>

      <PanelSection
        v-if="summary.droppedFields.length"
        :title="$t('blockTransferDroppedFields', 'Removed fields')"
        :help="
          $t(
            'blockTransferDroppedFieldsHelp',
            'These fields were dropped because they no longer exist on the target block type.',
          )
        "
        padded
      >
        <table class="bk-table">
          <thead>
            <tr>
              <th>{{ $t('bundle', 'Bundle') }}</th>
              <th>{{ $t('blockTransferFieldName', 'Field') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in summary.droppedFields"
              :key="`${row.bundle}-${row.fieldName}-${i}`"
            >
              <td>
                <code>{{ row.bundle }}</code>
              </td>
              <td>
                <code>{{ row.fieldName }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </PanelSection>

      <PanelSection
        v-if="summary.referencesResolvedByLabel.length"
        :title="
          $t(
            'blockTransferReferencesByLabel',
            'References matched by label — please verify',
          )
        "
        :help="
          $t(
            'blockTransferReferencesByLabelHelp',
            'These references could not be matched by ID and were resolved by label instead. Verify they point to the correct entity.',
          )
        "
        padded
      >
        <table class="bk-table">
          <thead>
            <tr>
              <th>{{ $t('blockTransferEntityType', 'Entity type') }}</th>
              <th>{{ $t('blockTransferLabel', 'Label') }}</th>
              <th>{{ $t('blockTransferTargetId', 'Target ID') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in summary.referencesResolvedByLabel"
              :key="`${row.entityType}-${row.targetId}-${i}`"
            >
              <td>
                <code>{{ row.entityType }}</code>
              </td>
              <td>{{ row.label }}</td>
              <td>
                <code>{{ row.targetId }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </PanelSection>

      <PanelSection
        v-if="summary.referencesUnresolved.length"
        :title="
          $t('blockTransferReferencesUnresolved', 'Unresolved references')
        "
        :help="
          $t(
            'blockTransferReferencesUnresolvedHelp',
            'These references could not be resolved on the target site and were left empty.',
          )
        "
        padded
      >
        <table class="bk-table">
          <thead>
            <tr>
              <th>{{ $t('blockTransferEntityType', 'Entity type') }}</th>
              <th>{{ $t('blockTransferLabel', 'Label') }}</th>
              <th>{{ $t('blockTransferReason', 'Reason') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in summary.referencesUnresolved"
              :key="`${row.uuid ?? row.label ?? ''}-${i}`"
            >
              <td>
                <code>{{ row.entityType }}</code>
              </td>
              <td>{{ row.label || '—' }}</td>
              <td>{{ row.reason }}</td>
            </tr>
          </tbody>
        </table>
      </PanelSection>
    </div>
  </DialogModal>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'

import { DialogModal } from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import type { BlockTransferImportSummary } from '../types'

const props = defineProps<{
  summary: BlockTransferImportSummary
}>()

defineEmits<{
  (e: 'close'): void
}>()

const { $t } = useBlokkli()

const leadText = computed(() => {
  const imported = $t(
    'blockTransferSummaryHeadline',
    '@count blocks imported.',
  ).replace('@count', String(props.summary.paragraphsImported))

  if (props.summary.referencesResolvedByUuid > 0) {
    const refs = $t(
      'blockTransferReferencesByUuid',
      '@count references resolved exactly.',
    ).replace('@count', String(props.summary.referencesResolvedByUuid))
    return `${imported} ${refs}`
  }

  return imported
})
</script>
