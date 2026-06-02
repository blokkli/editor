<template>
  <DiffApproval
    v-if="phase === 'approving' && approvalItems.length > 0"
    :items="approvalItems"
    insertions-only
    show-reason
    @apply="onApply"
    @cancel="onCancel"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, ref, onMounted } from '#imports'
import { DiffApproval } from '#blokkli/editor/components'
import type {
  McpToolContext,
  ComponentToolResult,
} from '#blokkli/agent/app/types'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'
import {
  skippedFieldsMessage,
  appendAgentNote,
  rejectedWithoutReasonMessage,
  type RejectedByUser,
} from '../fieldDiffApproval'
import type { ComponentParams, AutoTranslateResult } from './index'
import type { FieldDiffDetailItem } from '../../components/FieldDiffDetails/index.vue'

const props = defineProps<{
  context: McpToolContext
  params: ComponentParams
}>()

const emit = defineEmits<{
  (e: 'done', result: ComponentToolResult<AutoTranslateResult>): void
}>()

const blokkli = useBlokkli()
const { $t, state, context: entityContext, types } = blokkli

const phase = ref<'loading' | 'approving'>('loading')
const approvalItems = ref<ApprovalItem[]>([])

// `requestTranslation`, `loadTextFieldValuesForLanguage`, and
// `importTranslationsBatched` are guaranteed by `requiredAdapterMethods` on the
// tool definition. The Component prop typing doesn't carry that narrowing, so
// every call uses `!`.
const adapter = props.context.adapter

const skippedNote = skippedFieldsMessage(props.params.skipped)

function emitDone(result: ComponentToolResult<AutoTranslateResult>): void {
  emit('done', {
    ...result,
    agentMessage: appendAgentNote(result.agentMessage, skippedNote),
  })
}

function resolveFieldLabel(
  entityType: string,
  bundle: string,
  fieldName: string,
): string {
  const config = types.editableFieldConfig.forName(
    entityType,
    bundle,
    fieldName,
  )
  return config?.label || fieldName
}

onMounted(async () => {
  const sourceLanguage = state.translation.value.sourceLanguage || ''
  const targetLanguage = entityContext.value.language

  if (!sourceLanguage) {
    emitDone({
      acceptedCount: 0,
      rejectedByUser: {},
      label: $t('aiAgentAutoTranslateNoSource', 'No source language available'),
      agentMessage:
        'The host entity has no source language configured, so there is nothing to auto-translate from.',
    })
    return
  }

  const requestedUuids = new Set(props.params.uuids)

  const sourceValues =
    await adapter.loadTextFieldValuesForLanguage!(sourceLanguage)
  const toTranslate = sourceValues.filter(
    (v) => requestedUuids.has(v.uuid) && v.value.trim().length > 0,
  )

  if (!toTranslate.length) {
    emitDone({
      acceptedCount: 0,
      rejectedByUser: {},
      label: $t('aiAgentAutoTranslateNoFields', 'No text fields to translate'),
      agentMessage:
        'No text fields were found on the requested paragraphs in the source language. Use get_page_structure or get_content_fields to inspect what is editable.',
    })
    return
  }

  const byKey = new Map<string, TextFieldValue>(
    toTranslate.map((v) => [`${v.uuid}:${v.fieldName}`, v]),
  )

  const response = await adapter.requestTranslation!(
    toTranslate.map((v) => ({
      key: `${v.uuid}:${v.fieldName}`,
      text: v.value,
      isHtml: v.fieldType === 'markup',
      sourceLanguage,
      targetLanguage,
    })),
  )

  if (!response.success || !response.data.length) {
    emitDone({
      acceptedCount: 0,
      rejectedByUser: {},
      label: $t('aiAgentAutoTranslateFailed', 'Translation request failed'),
      agentMessage:
        'The backend translation service returned no results. Inform the user — they may need to retry, or use delegate_text_rewrite with template "translate" instead.',
    })
    return
  }

  let id = 0
  approvalItems.value = response.data.map((result) => {
    const separatorIndex = result.key.indexOf(':')
    const uuid = result.key.substring(0, separatorIndex)
    const fieldName = result.key.substring(separatorIndex + 1)
    const source = byKey.get(result.key)
    return {
      id: id++,
      uuid,
      fieldName,
      fieldLabel: source
        ? resolveFieldLabel(source.entityType, source.entityBundle, fieldName)
        : fieldName,
      value: result.translatedText,
    }
  })

  phase.value = 'approving'
})

async function onApply(data: {
  selected: Record<number, boolean>
  reasons: Record<number, string>
}) {
  const targetLanguage = entityContext.value.language
  const items = approvalItems.value
  const rejectedByUser: RejectedByUser = {}
  const accepted: ApprovalItem[] = []

  for (const item of items) {
    if (data.selected[item.id]) {
      accepted.push(item)
      continue
    }
    const fields = rejectedByUser[item.uuid] ?? {}
    fields[item.fieldName] = {
      reasonForRejection: data.reasons[item.id] || '',
    }
    rejectedByUser[item.uuid] = fields
  }

  if (accepted.length) {
    await state.mutateWithLoadingState(() =>
      adapter.importTranslationsBatched!({
        items: accepted.map((item) => ({
          langcode: targetLanguage,
          uuid: item.uuid,
          fieldName: item.fieldName,
          fieldValue: item.value,
        })),
      }),
    )
  }

  const acceptedCount = accepted.length
  const label =
    acceptedCount === items.length
      ? $t(
          'aiAgentAutoTranslateAllApplied',
          'All @count translations applied',
        ).replace('@count', String(acceptedCount))
      : $t(
          'aiAgentAutoTranslateSomeApplied',
          '@applied of @total translations applied',
        )
          .replace('@applied', String(acceptedCount))
          .replace('@total', String(items.length))

  const _details: FieldDiffDetailItem[] = accepted.map((item) => ({
    fieldLabel: item.fieldLabel,
    before: '',
    after: item.value,
  }))

  emitDone({
    acceptedCount,
    rejectedByUser,
    label,
    agentMessage: rejectedWithoutReasonMessage(rejectedByUser),
    historyIndex: state.currentMutationIndex.value,
    _details,
  })
}

function onCancel() {
  const rejectedByUser: RejectedByUser = {}
  for (const item of approvalItems.value) {
    const fields = rejectedByUser[item.uuid] ?? {}
    fields[item.fieldName] = { reasonForRejection: '' }
    rejectedByUser[item.uuid] = fields
  }

  emitDone({
    acceptedCount: 0,
    rejectedByUser,
    label: $t('aiAgentAutoTranslateAllRejected', 'All translations rejected'),
    agentMessage:
      'All translations were rejected by the user. Ask what they would like instead before retrying.',
  })
}
</script>
