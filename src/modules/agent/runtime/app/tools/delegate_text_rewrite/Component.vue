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

    items.push({
      id: itemId,
      uuid: fs.uuid,
      fieldName: fs.fieldName,
      fieldLabel: fs.fieldLabel,
      value: finalValue,
    })

    beforeValues.set(itemId, override.originalValue)
  }

  if (items.length === 0) {
    // No changes — restore and finish.
    restoreAll()
    emit('done', {
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
  emit('done', {
    acceptedCount: 0,
    rejectedByUser: {},
    label: $t('aiAgentDelegateRewriteCancelled', 'Rewriting cancelled'),
    agentMessage: 'Rewriting was cancelled by the user.',
    _usage: streamUsage.value,
  })
}

function finishWithError() {
  restoreAll()
  emit('done', {
    acceptedCount: 0,
    rejectedByUser: {},
    label: $t('rewritingFailed', 'Rewriting failed'),
    agentMessage: `Rewriting failed: ${errorMessage.value}`,
    _usage: streamUsage.value,
  })
}

async function applySelected(data: {
  selected: Record<number, boolean>
  reasons: Record<number, string>
}) {
  const { selected, reasons } = data

  const { acceptedCount, rejectedByUser, label } = await applyFieldDiffs(
    blokkli,
    props.context.adapter,
    completedItems.value,
    selected,
    reasons,
  )

  // Build a detailed agentMessage so the main agent knows what the sub-agent produced.
  const parts: string[] = []

  // Summarize accepted fields with their new values.
  const acceptedItems = completedItems.value.filter((item) => selected[item.id])
  if (acceptedItems.length > 0) {
    parts.push('Accepted fields:')
    for (const item of acceptedItems) {
      const truncated =
        item.value.length > 200 ? item.value.slice(0, 200) + '...' : item.value
      parts.push(`- ${item.uuid} "${item.fieldName}": ${truncated}`)
    }
  }

  // Summarize rejected fields with reasons.
  const rejectedItems = completedItems.value.filter(
    (item) => !selected[item.id],
  )
  if (rejectedItems.length > 0) {
    parts.push('Rejected fields:')
    for (const item of rejectedItems) {
      const reason = reasons[item.id] || ''
      const reasonText = reason ? ` (reason: ${reason})` : ' (no reason given)'
      parts.push(`- ${item.uuid} "${item.fieldName}"${reasonText}`)
    }
  }

  let agentMessage = parts.join('\n')

  // Add follow-up instructions for rejections without reasons.
  const followUp = rejectedWithoutReasonMessage(rejectedByUser)
  if (followUp) agentMessage += '\n' + followUp

  const _details: FieldDiffDetailItem[] = completedItems.value
    .filter((item) => selected[item.id])
    .map((item) => {
      const fs = findFieldState(item.uuid, item.fieldName)
      // Only include per-operation diffs when there were no retries.
      // Operations from different retry attempts reference different base
      // values, so individual search/replace pairs wouldn't make sense.
      const hadRetries = fs ? fs.allOperations.length > 0 : false
      const operations =
        fs?.mode === 'patch' && !hadRetries ? [...fs.operations] : []
      return {
        fieldLabel: item.fieldLabel,
        before: fs?.originalBaseValue || beforeValues.get(item.id) || '',
        after: item.value,
        mode: (fs?.mode || 'full') as 'full' | 'patch',
        operations,
      }
    })

  emit('done', {
    acceptedCount,
    rejectedByUser,
    label,
    agentMessage,
    historyIndex: state.currentMutationIndex.value,
    _details,
    _usage: streamUsage.value,
    _skipLlmResponse: rejectedItems.length === 0,
  })
}

onMounted(async () => {
  const { cancelled } = await start()
  if (cancelled) {
    emit('done', {
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
  // Force re-render any blocks whose DOM was manipulated via setDiffHtml.
  // No-op on the apply path (already flushed inside mutateWithLoadingState).
  state.flushDirty()
})
</script>
