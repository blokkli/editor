<template>
  <ToolCard
    v-if="phase === 'streaming'"
    icon="bk_mdi_stream"
    :title="streamingTitle"
    @cancel="onCancel"
  >
    <div class="flex flex-col gap-3 px-10 py-10">
      <div
        v-for="field in fieldStates"
        :key="field.uuid + field.fieldName"
        class="flex items-center gap-5 text-sm text-mono-600"
        :class="{
          'text-accent-700 font-medium': field.status === 'streaming',
          'text-lime-dark': field.status === 'done',
        }"
      >
        <Icon
          v-if="field.status === 'done'"
          name="bk_mdi_check"
          class="size-15"
        />
        <Icon
          v-else-if="field.status === 'streaming'"
          name="bk_mdi_edit"
          class="size-15"
        />
        <Icon v-else name="bk_mdi_hourglass_empty" class="size-15" />
        <span>{{ field.fieldLabel }}</span>
      </div>
    </div>
  </ToolCard>

  <DiffApproval
    v-else-if="phase === 'approval' && completedItems.length > 0"
    :items="completedItems"
    show-reason
    @apply="applySelected"
    @cancel="rejectAllFromApproval"
  />

  <ToolCard
    v-if="phase === 'error'"
    icon="bk_mdi_error"
    :title="$t('rewritingFailed', 'Rewriting failed')"
    @cancel="finishWithError"
  >
    <p>{{ errorMessage }}</p>
  </ToolCard>
</template>

<script lang="ts" setup>
import { useBlokkli, ref, onMounted, onBeforeUnmount } from '#imports'
import { Icon, DiffApproval } from '#blokkli/editor/components'
import { splitIntoSegments } from '#blokkli/editor/helpers/diff'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import type {
  McpToolContext,
  ComponentToolResult,
} from '#blokkli/agent/app/types'
import type { ComponentParams, StreamTextFieldsResult } from './index'
import { applyOperations } from '../helpers'
import {
  applyFieldDiffs,
  rejectedWithoutReasonMessage,
  partialRejectionGuidance,
  skippedFieldsMessage,
  appendAgentNote,
  type RejectedByUser,
} from '../fieldDiffApproval'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import type { FieldDiffDetailItem } from '../../components/FieldDiffDetails/index.vue'
import { useFieldRewriteStream } from './useFieldRewriteStream'

const props = defineProps<{
  context: McpToolContext
  params: ComponentParams
}>()

const emit = defineEmits<{
  (e: 'done', result: ComponentToolResult<StreamTextFieldsResult>): void
}>()

const blokkli = useBlokkli()
const { $t, state } = blokkli

// References that `execute` dropped because the paragraph/field doesn't exist.
// Appended to every terminal agentMessage so the agent learns what was skipped.
const skippedNote = skippedFieldsMessage(props.params.skipped)

function emitDone(result: ComponentToolResult<StreamTextFieldsResult>): void {
  emit('done', {
    ...result,
    agentMessage: appendAgentNote(result.agentMessage, skippedNote),
  })
}

const completedItems = ref<ApprovalItem[]>([])
const beforeValues = new Map<number, string>()

// The streaming subsystem (SSE transport, markup buffering, live-DOM overrides,
// readability retry) lives in the composable. `transitionToApproval` is the seam
// between streaming and the approval UI — it reads composable-owned state but
// writes approval state, so it stays here and is injected as `onComplete`.
const stream = useFieldRewriteStream({
  context: props.context,
  params: props.params,
  onComplete: () => transitionToApproval(),
})
const {
  phase,
  errorMessage,
  streamingTitle,
  streamUsage,
  fieldStates,
  findFieldState,
  findOverride,
  start,
  restoreAll,
  abort,
  dispose,
} = stream

function transitionToApproval() {
  let idCounter = 0
  const items: ApprovalItem[] = []

  for (const fs of fieldStates) {
    if (fs.status !== 'done') continue

    const override = findOverride(fs.uuid, fs.fieldName)
    if (!override) continue

    // Compute the final value based on mode.
    let finalValue: string
    if (fs.mode === 'patch') {
      finalValue = applyOperations(fs.baseValue, fs.operations)
    } else {
      finalValue = fs.fullValue
    }

    // Skip fields where value didn't change.
    if (override.originalValue === finalValue) continue

    const itemId = idCounter++

    // Resolve the field type so chunk segmentation only fires for markup
    // fields — plain text stays whole-field.
    const field = props.params.fields.find(
      (f) => f.uuid === fs.uuid && f.fieldName === fs.fieldName,
    )
    const segments = field
      ? (splitIntoSegments(
          override.originalValue,
          finalValue,
          field.fieldType,
        ) ?? undefined)
      : undefined

    items.push({
      id: itemId,
      uuid: fs.uuid,
      fieldName: fs.fieldName,
      fieldLabel: fs.fieldLabel,
      value: finalValue,
      segments,
    })

    beforeValues.set(itemId, override.originalValue)
  }

  if (items.length === 0) {
    // No changes — restore and finish.
    restoreAll()
    emitDone({
      acceptedCount: 0,
      rejectedByUser: {},
      label: $t('aiAgentDelegateRewriteNoChanges', 'No changes detected'),
      agentMessage: 'The rewriting produced no changes to any fields.',
      _usage: streamUsage.value,
    })
    return
  }

  // Restore all overrides before showing approval UI.
  // The Item.vue components will apply their own overrides.
  restoreAll()

  completedItems.value = items
  phase.value = 'approval'
}

function onCancel() {
  abort()
  restoreAll()
  emitDone({
    acceptedCount: 0,
    rejectedByUser: {},
    label: $t('aiAgentDelegateRewriteCancelled', 'Rewriting cancelled'),
    agentMessage: 'Rewriting was cancelled by the user.',
    _usage: streamUsage.value,
  })
}

function finishWithError() {
  restoreAll()
  emitDone({
    acceptedCount: 0,
    rejectedByUser: {},
    label: $t('rewritingFailed', 'Rewriting failed'),
    agentMessage: `Rewriting failed: ${errorMessage.value}`,
    _usage: streamUsage.value,
  })
}

function rejectAllFromApproval() {
  const rejectedByUser: RejectedByUser = {}
  for (const item of completedItems.value) {
    const fields = rejectedByUser[item.uuid] ?? {}
    fields[item.fieldName] = { reasonForRejection: '' }
    rejectedByUser[item.uuid] = fields
  }

  emitDone({
    acceptedCount: 0,
    rejectedByUser,
    label: $t('aiAgentDelegateRewriteAllRejected', 'All changes rejected'),
    agentMessage:
      'All proposed changes were rejected by the user. Ask the user what they would like to change instead.',
    _usage: streamUsage.value,
  })
}

async function applySelected(data: {
  selected: Record<string, boolean>
  reasons: Record<string, string>
}) {
  const { selected, reasons } = data

  const { acceptedCount, rejectedByUser, label, appliedByItemId } =
    await applyFieldDiffs(
      blokkli,
      props.context.adapter,
      completedItems.value,
      selected,
      reasons,
    )

  // Build a detailed agentMessage so the main agent knows what the sub-agent produced.
  const parts: string[] = []

  // Fully accepted fields: written, and absent from rejectedByUser.
  const fullyAccepted = completedItems.value.filter(
    (item) =>
      appliedByItemId[item.id] !== undefined &&
      !rejectedByUser[item.uuid]?.[item.fieldName],
  )
  if (fullyAccepted.length > 0) {
    parts.push('Accepted fields:')
    for (const item of fullyAccepted) {
      const written = appliedByItemId[item.id]!
      const truncated =
        written.length > 200 ? written.slice(0, 200) + '...' : written
      parts.push(`- ${item.uuid} "${item.fieldName}": ${truncated}`)
    }
  }

  // Partially accepted fields: a hybrid was written, and some chunks were
  // rejected. Surface both so the agent knows the field changed AND which
  // chunks it should target if asked to follow up.
  const partials = completedItems.value
    .map((item) => {
      const entry = rejectedByUser[item.uuid]?.[item.fieldName]
      if (!entry?.partial || appliedByItemId[item.id] === undefined) return null
      return { item, entry }
    })
    .filter(
      (p): p is { item: ApprovalItem; entry: NonNullable<typeof p>['entry'] } =>
        p !== null,
    )
  if (partials.length > 0) {
    parts.push('Partially accepted fields:')
    for (const { item, entry } of partials) {
      const { accepted, total, rejectedSegments } = entry.partial!
      parts.push(
        `- ${item.uuid} "${item.fieldName}": ${accepted}/${total} chunks accepted`,
      )
      for (const seg of rejectedSegments) {
        const reasonText = seg.reasonForRejection
          ? ` (reason: ${seg.reasonForRejection})`
          : ' (no reason given)'
        parts.push(`  · rejected <${seg.tag}> (${seg.status})${reasonText}`)
      }
    }
  }

  // Fully rejected fields: nothing written, no partial info.
  const fullyRejected = completedItems.value
    .map((item) => {
      const entry = rejectedByUser[item.uuid]?.[item.fieldName]
      if (!entry || entry.partial || appliedByItemId[item.id] !== undefined) {
        return null
      }
      return { item, entry }
    })
    .filter(
      (p): p is { item: ApprovalItem; entry: NonNullable<typeof p>['entry'] } =>
        p !== null,
    )
  if (fullyRejected.length > 0) {
    parts.push('Rejected fields:')
    for (const { item, entry } of fullyRejected) {
      const reasonText = entry.reasonForRejection
        ? ` (reason: ${entry.reasonForRejection})`
        : ' (no reason given)'
      parts.push(`- ${item.uuid} "${item.fieldName}"${reasonText}`)
    }
  }

  let agentMessage = parts.join('\n')

  const partialNote = partialRejectionGuidance(rejectedByUser)
  if (partialNote) agentMessage += '\n\n' + partialNote

  const followUp = rejectedWithoutReasonMessage(rejectedByUser)
  if (followUp) agentMessage += '\n' + followUp

  const _details: FieldDiffDetailItem[] = completedItems.value
    .filter((item) => appliedByItemId[item.id] !== undefined)
    .map((item) => {
      const fs = findFieldState(item.uuid, item.fieldName)
      // Operations are only meaningful when the entire field was accepted —
      // a partial acceptance reassembles from `splitIntoSegments` rather than
      // the original patch operations, and retries swap the base value out
      // from under each operation.
      const isPartial = !!rejectedByUser[item.uuid]?.[item.fieldName]?.partial
      const hadRetries = fs ? fs.allOperations.length > 0 : false
      const operations =
        fs?.mode === 'patch' && !hadRetries && !isPartial
          ? [...fs.operations]
          : []
      return {
        fieldLabel: item.fieldLabel,
        before: fs?.originalBaseValue || beforeValues.get(item.id) || '',
        after: appliedByItemId[item.id]!,
        mode: (fs?.mode || 'full') as 'full' | 'patch',
        operations,
      }
    })

  const anyRejection = Object.keys(rejectedByUser).length > 0

  emitDone({
    acceptedCount,
    rejectedByUser,
    label,
    agentMessage,
    historyIndex: state.currentMutationIndex.value,
    _details,
    _usage: streamUsage.value,
    // Let the agent respond if anything was rejected or skipped, so it can
    // retry the skipped references.
    _skipLlmResponse: !anyRejection && !skippedNote,
  })
}

onMounted(async () => {
  const { cancelled } = await start()
  if (cancelled) {
    emitDone({
      acceptedCount: 0,
      rejectedByUser: {},
      label: $t('aiAgentDelegateRewriteCancelled', 'Rewriting cancelled'),
      agentMessage: 'Rewriting was cancelled by the user.',
      _usage: streamUsage.value,
    })
  }
})

onBeforeUnmount(() => {
  dispose()
  // During streaming, setValue updated mutatedItemProps — restore to original.
  // During approval, mutatedItemProps is already at original (from
  // transitionToApproval's restoreAll), so we skip to avoid the flash.
  if (phase.value === 'streaming') {
    restoreAll()
  }
})
</script>
