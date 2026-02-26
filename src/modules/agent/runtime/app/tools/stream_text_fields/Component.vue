<template>
  <ToolCard
    v-if="phase === 'streaming'"
    icon="bk_mdi_stream"
    :title="streamingTitle"
    @cancel="onCancel"
  >
    <div class="bk-stream-text-fields-progress">
      <div
        v-for="field in fieldStates"
        :key="field.uuid + field.fieldName"
        class="bk-stream-text-fields-progress-item"
        :class="{
          'bk-is-active': field.status === 'streaming',
          'bk-is-done': field.status === 'done',
        }"
      >
        <Icon v-if="field.status === 'done'" name="bk_mdi_check" />
        <Icon v-else-if="field.status === 'streaming'" name="bk_mdi_edit" />
        <Icon v-else name="bk_mdi_hourglass_empty" />
        <span>{{ field.fieldLabel }}</span>
      </div>
    </div>
  </ToolCard>

  <ToolCard
    v-else-if="phase === 'approval'"
    icon="bk_mdi_edit"
    :title="
      $t('aiAgentStreamTextFieldsReview', 'Review @count fields').replace(
        '@count',
        String(completedItems.length),
      )
    "
    @cancel="rejectAll"
  >
    <div>
      <div class="bk-batch-rewrite-mode-selector">
        <FormRadioTabs
          :id="'stream-text-diff-mode-' + id"
          v-model="diffMode"
          :options="diffModeOptions"
          :label="$t('diffModeLabel', 'Display')"
        />
      </div>
      <div class="bk-batch-rewrite-list" @mouseleave="onMouseLeave">
        <div v-for="item in completedItems" :key="item.id">
          <ItemComponent
            v-model:selected="selected[item.id]"
            v-model:reason="reasons[item.id]"
            :uuid="item.uuid"
            :field-name="item.fieldName"
            :field-label="item.fieldLabel"
            :new-value="item.value"
            :diff-mode="diffMode"
            :operations="item.operations"
          />
          <div
            v-if="item.readabilityAfter"
            class="bk-stream-text-readability-badge"
            :class="'bk-is-' + (item.readabilityLevel || 'good')"
          >
            <span
              >LIX: {{ formatLix(item.readabilityBefore) }} →
              {{ formatLix(item.readabilityAfter) }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
        @click="applySelected"
      >
        <Icon name="bk_mdi_check" />
        <span>{{ applyLabel }}</span>
      </button>
    </template>
  </ToolCard>

  <ToolCard
    v-else-if="phase === 'error'"
    icon="bk_mdi_error"
    :title="$t('aiAgentStreamTextFieldsError', 'Streaming failed')"
    @cancel="finishWithError"
  >
    <p>{{ errorMessage }}</p>
  </ToolCard>
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  useId,
} from '#imports'
import { Icon, FormRadioTabs } from '#blokkli/editor/components'
import type { DiffDisplayMode } from '#blokkli/editor/components/DiffViewer/DiffDisplay/index.vue'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import ItemComponent from '../update_text_fields/Item.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { ComponentParams, StreamTextFieldsResult } from './index'
import type { UsageTurn } from '#blokkli/agent/shared/types'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import { useEditableFieldOverride } from '#blokkli/editor/composables'
import {
  applyOperations,
  runReadabilityAnalysis,
  type ReadabilityResult,
} from '../helpers'

const props = defineProps<{
  context: McpToolContext
  params: ComponentParams
}>()

export type StreamTextFieldsDetailItem = {
  fieldLabel: string
  before: string
  after: string
  mode: 'full' | 'patch'
  operations: Array<{ search: string; replace: string }>
}

const emit = defineEmits<{
  (
    e: 'done',
    result: StreamTextFieldsResult & {
      _details?: StreamTextFieldsDetailItem[]
      _usage?: UsageTurn
    },
  ): void
}>()

const {
  $t,
  state,
  blocks,
  context: editorContext,
  types,
  eventBus,
  storage,
} = useBlokkli()

const id = useId()

const diffMode = storage.use<DiffDisplayMode>('diffMode', 'inline')

const diffModeOptions = computed(() => [
  { value: 'inline', label: $t('diffModeInline', 'Inline') },
  { value: 'side_by_side', label: $t('diffModeSideBySide', 'Both') },
  { value: 'after', label: $t('diffModeAfter', 'After') },
])

type Phase = 'streaming' | 'approval' | 'error'
const phase = ref<Phase>('streaming')
const errorMessage = ref('')
const streamUsage = ref<UsageTurn>()

// Readability retry configuration.
const MAX_READABILITY_RETRIES = 3
const isFixReadability = props.params.template === 'fix_readability'
const retryAttempt = ref(0)
const streamingTitle = ref(
  $t('aiAgentStreamTextFieldsStreaming', 'Streaming @count fields...').replace(
    '@count',
    String(props.params.fields.length),
  ),
)

type FieldState = {
  uuid: string
  fieldName: string
  fieldLabel: string
  status: 'pending' | 'streaming' | 'done'
  mode: 'full' | 'patch' | null
  fullValue: string
  operations: Array<{ search: string; replace: string }>
  currentSearch: string
  baseValue: string
}

const fieldStates = reactive<FieldState[]>(
  props.params.fields.map((f) => ({
    uuid: f.uuid,
    fieldName: f.fieldName,
    fieldLabel: resolveFieldLabel(f.uuid, f.fieldName),
    status: 'pending' as const,
    mode: null,
    fullValue: '',
    operations: [],
    currentSearch: '',
    baseValue: f.currentValue,
  })),
)

// Track overrides for live DOM updates.
type OverrideEntry = {
  uuid: string
  fieldName: string
  setValue: (value: string) => void
  restore: () => void
  originalValue: string
}

const overrides: OverrideEntry[] = []
let abortController: AbortController | null = null

// Completed items for approval phase.
type CompletedItem = {
  id: number
  uuid: string
  fieldName: string
  fieldLabel: string
  value: string
  operations: Array<{ search: string; replace: string }>
  readabilityBefore?: Record<string, number>
  readabilityAfter?: Record<string, number>
  readabilityLevel?: 'good' | 'ok' | 'hard'
}

const completedItems = ref<CompletedItem[]>([])
const selected = reactive<Record<number, boolean>>({})
const reasons = reactive<Record<number, string>>({})
const beforeValues = new Map<number, string>()

// Readability score tracking.
type ReadabilityCheck = {
  level: 'good' | 'ok' | 'hard'
  scores: Record<string, number>
}

const readabilityBeforeScores = new Map<string, ReadabilityCheck>()
const readabilityAfterScores = new Map<string, ReadabilityCheck>()

function resolveHost(uuid: string): EntityContext | null {
  if (uuid === editorContext.value.entityUuid) {
    return {
      type: editorContext.value.entityType,
      bundle: editorContext.value.entityBundle,
      uuid,
    }
  }
  const block = blocks.getBlock(uuid)
  if (!block) return null
  return { type: itemEntityType, bundle: block.bundle, uuid }
}

function resolveFieldLabel(uuid: string, fieldName: string): string {
  const host = resolveHost(uuid)
  if (!host) return fieldName
  const config = types.editableFieldConfig.forName(
    host.type,
    host.bundle,
    fieldName,
  )
  return config?.label || fieldName
}

// Create overrides upfront during setup for all fields.
for (const field of props.params.fields) {
  const host = resolveHost(field.uuid)
  if (!host) continue
  const override = useEditableFieldOverride(field.fieldName, host)
  overrides.push({
    uuid: field.uuid,
    fieldName: field.fieldName,
    setValue: override.setValue,
    restore: override.restore,
    originalValue: override.originalValue,
  })
}

function findOverride(
  uuid: string,
  fieldName: string,
): OverrideEntry | undefined {
  return overrides.find((o) => o.uuid === uuid && o.fieldName === fieldName)
}

function findFieldState(
  uuid: string,
  fieldName: string,
): FieldState | undefined {
  return fieldStates.find((f) => f.uuid === uuid && f.fieldName === fieldName)
}

// Buffer for markup fields to avoid rendering partial HTML.
let markupBuffer = ''
let markupBufferField: { uuid: string; fieldName: string } | null = null
let markupFlushTimer: ReturnType<typeof setTimeout> | null = null

function flushMarkupBuffer() {
  if (markupBufferField && markupBuffer) {
    const override = findOverride(
      markupBufferField.uuid,
      markupBufferField.fieldName,
    )
    if (override) {
      override.setValue(markupBuffer)
    }
  }
  if (markupFlushTimer) {
    clearTimeout(markupFlushTimer)
    markupFlushTimer = null
  }
}

function getFieldType(uuid: string, fieldName: string): 'plain' | 'markup' {
  const field = props.params.fields.find(
    (f) => f.uuid === uuid && f.fieldName === fieldName,
  )
  return field?.fieldType || 'plain'
}

function applyDelta(uuid: string, fieldName: string, value: string) {
  const fieldType = getFieldType(uuid, fieldName)

  if (fieldType === 'markup') {
    // Buffer markup and only flush when we have a complete tag or on timer.
    markupBuffer = value
    markupBufferField = { uuid, fieldName }

    // Flush if the value ends with a closing tag.
    if (value.endsWith('>')) {
      flushMarkupBuffer()
    } else {
      // Debounce: flush after 100ms if no closing tag arrives.
      if (markupFlushTimer) clearTimeout(markupFlushTimer)
      markupFlushTimer = setTimeout(flushMarkupBuffer, 100)
    }
  } else {
    // Plain text: apply directly.
    const override = findOverride(uuid, fieldName)
    if (override) {
      override.setValue(value)
    }
  }
}

/**
 * Compute the current preview value for a patch-mode field,
 * applying completed operations plus the current partial replacement.
 */
function computePatchPreview(
  baseValue: string,
  operations: Array<{ search: string; replace: string }>,
  currentSearch: string,
  partialReplace: string,
): string {
  // Apply all completed operations.
  let result = applyOperations(baseValue, operations)
  // Apply the in-progress replacement if we have one.
  if (currentSearch && partialReplace) {
    const idx = result.indexOf(currentSearch)
    if (idx !== -1) {
      result =
        result.slice(0, idx) +
        partialReplace +
        result.slice(idx + currentSearch.length)
    }
  }
  return result
}

/**
 * Compute the proposed value for a field based on its current state.
 */
function getProposedValue(fs: FieldState): string {
  if (fs.status !== 'done') return fs.baseValue
  if (fs.mode === 'patch') {
    return applyOperations(fs.baseValue, fs.operations)
  }
  return fs.fullValue
}

/**
 * Format a LIX score for display.
 */
function formatLix(scores?: Record<string, number>): string {
  if (!scores || scores.lix === undefined) return '?'
  return String(Math.round(scores.lix))
}

/**
 * Run DOM-based readability analysis and return issues for our fields.
 * Uses the same analysis path as get_readability_issues, so results
 * are consistent. The DOM overrides must reflect the values to check.
 */
async function analyzeReadability(): Promise<
  Map<
    string,
    {
      issues: ReadabilityResult[string][string]['issues']
      worstLevel: 'good' | 'ok' | 'hard'
      worstScores: Record<string, number>
    }
  >
> {
  const result = await runReadabilityAnalysis(
    props.context.app,
    itemEntityType,
  )

  const fieldMap = new Map<
    string,
    {
      issues: ReadabilityResult[string][string]['issues']
      worstLevel: 'good' | 'ok' | 'hard'
      worstScores: Record<string, number>
    }
  >()

  for (const fs of fieldStates) {
    const key = fs.uuid + ':' + fs.fieldName
    const fieldIssues = result[fs.uuid]?.[fs.fieldName]?.issues ?? []

    let worstLevel: 'good' | 'ok' | 'hard' = 'good'
    let worstScores: Record<string, number> = {}

    for (const issue of fieldIssues) {
      const impact = issue.impact
      const level =
        impact === 'critical' || impact === 'serious'
          ? 'hard'
          : impact === 'moderate'
            ? 'ok'
            : 'good'
      if (level === 'hard' || (level === 'ok' && worstLevel === 'good')) {
        worstLevel = level
        worstScores = issue.scores ?? {}
      }
    }

    fieldMap.set(key, { issues: fieldIssues, worstLevel, worstScores })
  }

  return fieldMap
}

/**
 * Accumulate usage from a streaming pass into the total.
 */
function addUsage(usage: UsageTurn) {
  if (!streamUsage.value) {
    streamUsage.value = { ...usage }
  } else {
    streamUsage.value.inputTokens += usage.inputTokens
    streamUsage.value.outputTokens += usage.outputTokens
    streamUsage.value.cacheCreationInputTokens += usage.cacheCreationInputTokens
    streamUsage.value.cacheReadInputTokens += usage.cacheReadInputTokens
  }
}

function handleSSEEvent(eventType: string, data: string) {
  try {
    const parsed = JSON.parse(data)

    switch (eventType) {
      case 'field_start': {
        const fs = findFieldState(parsed.uuid, parsed.fieldName)
        if (fs) {
          fs.status = 'streaming'
          fs.mode = parsed.mode || 'full'
        }
        break
      }
      case 'field_delta': {
        // Full mode delta — accumulated value.
        const fs = findFieldState(parsed.uuid, parsed.fieldName)
        if (fs) fs.fullValue = parsed.value
        applyDelta(parsed.uuid, parsed.fieldName, parsed.value)
        break
      }
      case 'replace_delta': {
        // Patch mode — partial replacement streaming.
        const fs = findFieldState(parsed.uuid, parsed.fieldName)
        if (fs) {
          fs.currentSearch = parsed.search
          const preview = computePatchPreview(
            fs.baseValue,
            fs.operations,
            parsed.search,
            parsed.value,
          )
          applyDelta(parsed.uuid, parsed.fieldName, preview)
        }
        break
      }
      case 'operation_end': {
        // Completed search/replace operation.
        const fs = findFieldState(parsed.uuid, parsed.fieldName)
        if (fs) {
          fs.operations.push({
            search: parsed.search,
            replace: parsed.replace,
          })
          fs.currentSearch = ''
          // Recompute and apply the full value with all operations.
          const value = applyOperations(fs.baseValue, fs.operations)
          applyDelta(parsed.uuid, parsed.fieldName, value)
        }
        break
      }
      case 'field_end': {
        // Flush any buffered markup for this field.
        if (
          markupBufferField &&
          markupBufferField.uuid === parsed.uuid &&
          markupBufferField.fieldName === parsed.fieldName
        ) {
          flushMarkupBuffer()
        }

        const fs = findFieldState(parsed.uuid, parsed.fieldName)
        if (fs) {
          fs.status = 'done'

          // Compute final value.
          const override = findOverride(parsed.uuid, parsed.fieldName)
          if (override) {
            let finalValue: string
            if (fs.mode === 'patch') {
              finalValue = applyOperations(fs.baseValue, fs.operations)
            } else {
              finalValue = fs.fullValue
            }
            override.setValue(finalValue)
          }
        }
        break
      }
      case 'error': {
        phase.value = 'error'
        errorMessage.value = parsed.message || 'Stream error'
        break
      }
      case 'done': {
        if (parsed.usage) {
          addUsage(parsed.usage)
        }
        break
      }
    }
  } catch {
    // Ignore malformed SSE events.
  }
}

/**
 * Fetch and process an SSE stream for the given fields and template params.
 * Returns true if the stream completed successfully.
 */
async function fetchStream(
  authToken: string,
  requestFields: Array<{
    uuid: string
    fieldName: string
    currentValue: string
    fieldType: 'plain' | 'markup'
  }>,
  templateParams: Record<string, unknown>,
): Promise<boolean> {
  abortController = new AbortController()

  try {
    const response = await fetch('/api/blokkli/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authToken,
        template: props.params.template,
        templateParams,
        fields: requestFields,
        pageContext: props.context.pageContext,
      }),
      signal: abortController.signal,
    })

    if (!response.ok || !response.body) {
      phase.value = 'error'
      errorMessage.value = `Server returned ${response.status}`
      return false
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events from buffer.
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      let eventType = ''
      let eventData = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7)
        } else if (line.startsWith('data: ')) {
          eventData = line.slice(6)
        } else if (line === '' && eventType && eventData) {
          handleSSEEvent(eventType, eventData)
          eventType = ''
          eventData = ''
        }
      }
    }

    // Flush any remaining markup buffer.
    flushMarkupBuffer()
    return true
  } catch (error) {
    if (abortController?.signal.aborted) {
      // User cancelled — restore and finish.
      restoreAll()
      emit('done', {
        acceptedCount: 0,
        rejectedByUser: {},
        label: $t('aiAgentStreamTextFieldsCancelled', 'Streaming cancelled'),
        agentMessage: 'Streaming was cancelled by the user.',
        _usage: streamUsage.value,
      })
      return false
    }
    phase.value = 'error'
    errorMessage.value =
      error instanceof Error ? error.message : 'Unknown error'
    return false
  }
}

/**
 * Run readability verification and retry loop after the initial stream.
 * Uses the same DOM-based analyzer as get_readability_issues so results
 * are consistent. The DOM overrides are already applied from streaming.
 */
async function readabilityRetryLoop(authToken: string) {
  for (let attempt = 0; attempt < MAX_READABILITY_RETRIES; attempt++) {
    streamingTitle.value = $t(
      'aiAgentStreamTextFieldsChecking',
      'Checking readability...',
    )

    // Run DOM-based readability analysis on the current state.
    // The DOM already has overrides applied from streaming.
    const analysis = await analyzeReadability()

    // Store scores and classify fields.
    type FieldCheck = {
      fs: FieldState
      fieldType: 'plain' | 'markup'
      proposedValue: string
      level: 'good' | 'ok' | 'hard'
      scores: Record<string, number>
      issues: ReadabilityResult[string][string]['issues']
    }

    const failing: FieldCheck[] = []
    const passing: FieldCheck[] = []

    for (const fs of fieldStates) {
      if (fs.status !== 'done') continue
      const field = props.params.fields.find(
        (f) => f.uuid === fs.uuid && f.fieldName === fs.fieldName,
      )
      if (!field) continue

      const key = fs.uuid + ':' + fs.fieldName
      const entry = analysis.get(key)
      const level = entry?.worstLevel ?? 'good'
      const scores = entry?.worstScores ?? {}
      const issues = entry?.issues ?? []
      const proposedValue = getProposedValue(fs)

      // Store "after" scores for the approval UI.
      readabilityAfterScores.set(key, { level, scores })

      // On the first attempt, also capture "before" scores from the original values.
      if (attempt === 0) {
        // "Before" scores come from the issues that were present before
        // streaming started — use the templateParams.issues if available,
        // otherwise just mark as unknown.
        const originalIssues =
          props.params.templateParams?.issues as
            | Array<{ scores?: Record<string, number> }>
            | undefined
        if (originalIssues?.length) {
          // Find the worst score from original issues for this field's index.
          const fieldIndex = props.params.fields.indexOf(field)
          let worstOriginalScores: Record<string, number> = {}
          for (const issue of originalIssues) {
            if (
              'fieldIndex' in issue &&
              (issue as { fieldIndex: number }).fieldIndex === fieldIndex &&
              issue.scores
            ) {
              worstOriginalScores = issue.scores
            }
          }
          readabilityBeforeScores.set(key, {
            level: 'hard',
            scores: worstOriginalScores,
          })
        }
      }

      const check: FieldCheck = {
        fs,
        fieldType: field.fieldType,
        proposedValue,
        level,
        scores,
        issues,
      }

      if (level === 'hard') {
        failing.push(check)
      } else {
        passing.push(check)
      }
    }

    // All pass — done.
    if (failing.length === 0) break

    // Max retries reached — show what we have.
    if (attempt === MAX_READABILITY_RETRIES - 1) break

    // Build retry context with passing fields for sub-agent reference.
    const contextParts: string[] = []
    if (passing.length > 0) {
      contextParts.push(
        'The following fields were already improved and now have good readability:',
      )
      for (const p of passing) {
        const truncated =
          p.proposedValue.length > 200
            ? p.proposedValue.slice(0, 200) + '...'
            : p.proposedValue
        const lixScore = p.scores.lix
          ? ` (LIX: ${Math.round(p.scores.lix)})`
          : ''
        contextParts.push(`- "${p.fs.fieldLabel}": "${truncated}"${lixScore}`)
      }
      contextParts.push('')
    }
    contextParts.push(
      'Your previous rewrite for the remaining fields did not lower readability scores enough. Try a different approach:',
    )
    contextParts.push('- Use shorter sentences (max 10-12 words per sentence)')
    contextParts.push(
      '- Replace complex or uncommon words with simple alternatives',
    )
    contextParts.push('- Break compound sentences into multiple simple ones')

    const retryContext = contextParts.join('\n')

    // Reset failing field states for retry.
    for (const f of failing) {
      f.fs.status = 'pending'
      f.fs.mode = null
      f.fs.baseValue = f.proposedValue
      f.fs.fullValue = ''
      f.fs.operations = []
      f.fs.currentSearch = ''
    }

    retryAttempt.value = attempt + 1

    // Build retry request with only failing fields.
    const retryFields = failing.map((f) => ({
      uuid: f.fs.uuid,
      fieldName: f.fs.fieldName,
      currentValue: f.proposedValue,
      fieldType: f.fieldType,
    }))

    // Build issues from the actual analyzer results — same format as
    // the fix_readability template expects.
    const retryIssues: Array<{
      fieldIndex: number
      text: string
      impact: string
      scores: Record<string, number>
    }> = []
    for (let i = 0; i < failing.length; i++) {
      for (const issue of failing[i]!.issues) {
        retryIssues.push({
          fieldIndex: i,
          text: issue.text,
          impact: issue.impact || 'critical',
          scores: issue.scores || {},
        })
      }
    }

    streamingTitle.value = $t(
      'aiAgentStreamTextFieldsRetrying',
      'Retrying @count fields (attempt @attempt)...',
    )
      .replace('@count', String(failing.length))
      .replace('@attempt', String(retryAttempt.value + 1))

    // Get a fresh auth token for the retry.
    let retryToken = authToken
    if (props.context.adapter.getAgentAuthToken) {
      const fresh = await props.context.adapter.getAgentAuthToken()
      if (fresh) retryToken = fresh
    }

    const retrySuccess = await fetchStream(retryToken, retryFields, {
      issues: retryIssues,
      retryContext,
    })

    if (!retrySuccess) return
  }
}

async function startStreaming() {
  // Get auth token.
  let authToken: string | null = null
  if (props.context.adapter.getAgentAuthToken) {
    authToken = await props.context.adapter.getAgentAuthToken()
  }
  if (!authToken) {
    phase.value = 'error'
    errorMessage.value = 'Failed to get authentication token'
    return
  }

  // First pass: stream all fields.
  const requestFields = props.params.fields.map((f) => ({
    uuid: f.uuid,
    fieldName: f.fieldName,
    currentValue: f.currentValue,
    fieldType: f.fieldType,
  }))

  const success = await fetchStream(
    authToken,
    requestFields,
    props.params.templateParams,
  )
  if (!success) return

  // For fix_readability: verify and retry if needed.
  if (isFixReadability) {
    await readabilityRetryLoop(authToken)
    // If cancelled or errored during retry, don't transition to approval.
    if (phase.value !== 'streaming') return
  }

  transitionToApproval()
}

function transitionToApproval() {
  let idCounter = 0
  const items: CompletedItem[] = []

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
    const scoreKey = fs.uuid + ':' + fs.fieldName

    items.push({
      id: itemId,
      uuid: fs.uuid,
      fieldName: fs.fieldName,
      fieldLabel: fs.fieldLabel,
      value: finalValue,
      operations: fs.mode === 'patch' ? [...fs.operations] : [],
      readabilityBefore: readabilityBeforeScores.get(scoreKey)?.scores,
      readabilityAfter: readabilityAfterScores.get(scoreKey)?.scores,
      readabilityLevel: readabilityAfterScores.get(scoreKey)?.level,
    })

    selected[itemId] = true
    reasons[itemId] = ''
    beforeValues.set(itemId, override.originalValue)
  }

  if (items.length === 0) {
    // No changes — restore and finish.
    restoreAll()
    emit('done', {
      acceptedCount: 0,
      rejectedByUser: {},
      label: $t('aiAgentStreamTextFieldsNoChanges', 'No changes detected'),
      agentMessage: 'The streaming produced no changes to any fields.',
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

function restoreAll() {
  for (const override of overrides) {
    override.restore()
  }
}

function onMouseLeave() {
  eventBus.emit('highlight', null)
}

function onCancel() {
  if (abortController) {
    abortController.abort()
  }
  restoreAll()
  emit('done', {
    acceptedCount: 0,
    rejectedByUser: {},
    label: $t('aiAgentStreamTextFieldsCancelled', 'Streaming cancelled'),
    agentMessage: 'Streaming was cancelled by the user.',
    _usage: streamUsage.value,
  })
}

function finishWithError() {
  restoreAll()
  emit('done', {
    acceptedCount: 0,
    rejectedByUser: {},
    label: $t('aiAgentStreamTextFieldsFailed', 'Streaming failed'),
    agentMessage: `Streaming failed: ${errorMessage.value}`,
    _usage: streamUsage.value,
  })
}

async function applySelected() {
  const rejectedByUser: Record<
    string,
    Record<string, { reasonForRejection: string }>
  > = {}

  const entityUuid = editorContext.value.entityUuid

  const batchItems: Array<{
    uuid: string
    fieldName: string
    fieldValue: string
  }> = []
  const entityItems: Array<{ fieldName: string; fieldValue: string }> = []

  for (const item of completedItems.value) {
    if (!selected[item.id]) {
      const fields = rejectedByUser[item.uuid] ?? {}
      fields[item.fieldName] = { reasonForRejection: reasons[item.id] || '' }
      rejectedByUser[item.uuid] = fields
      continue
    }

    if (item.uuid === entityUuid) {
      entityItems.push({
        fieldName: item.fieldName,
        fieldValue: item.value,
      })
    } else {
      batchItems.push({
        uuid: item.uuid,
        fieldName: item.fieldName,
        fieldValue: item.value,
      })
    }
  }

  await state.mutateWithLoadingState(() =>
    props.context.adapter.updateFieldValueBatched!({
      items: batchItems,
      entityItems,
    }),
  )

  const acceptedCount = batchItems.length + entityItems.length

  const label =
    acceptedCount === completedItems.value.length
      ? $t(
          'aiAgentBatchRewriteAllApplied',
          'All @count changes applied',
        ).replace('@count', String(acceptedCount))
      : $t(
          'aiAgentBatchRewriteSomeApplied',
          '@applied of @total changes applied',
        )
          .replace('@applied', String(acceptedCount))
          .replace('@total', String(completedItems.value.length))

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

  let agentMessage: string | undefined = parts.join('\n')

  // Add follow-up instructions for rejections without reasons.
  const rejectedWithoutReason: Array<{ uuid: string; fieldName: string }> = []
  for (const [uuid, fields] of Object.entries(rejectedByUser)) {
    for (const [fieldName, v] of Object.entries(fields)) {
      if (!v?.reasonForRejection) {
        rejectedWithoutReason.push({ uuid, fieldName })
      }
    }
  }

  if (
    rejectedWithoutReason.length === 1 ||
    rejectedWithoutReason.length === 2
  ) {
    const fieldList = rejectedWithoutReason
      .map((r) => `"${r.fieldName}" of paragraph ${r.uuid}`)
      .join(' and ')
    agentMessage += `\nThe user rejected ${fieldList} without a reason. Use the ask_question tool to present the user with 2 or more alternative texts for each rejected field.`
  } else if (rejectedWithoutReason.length > 2) {
    agentMessage +=
      '\nSome changes were rejected without a reason. Ask the user what they would like to change instead.'
  }

  // Add readability summary to agent message if scores are available.
  if (isFixReadability) {
    const allPassed = acceptedItems.every(
      (item) => item.readabilityLevel !== 'hard',
    )
    if (allPassed) {
      agentMessage += '\nAll accepted fields now meet readability requirements.'
    } else {
      const stillHard = acceptedItems.filter(
        (item) => item.readabilityLevel === 'hard',
      )
      agentMessage += `\n${stillHard.length} accepted field(s) still have readability issues despite retries.`
    }
  }

  const _details: StreamTextFieldsDetailItem[] = completedItems.value
    .filter((item) => selected[item.id])
    .map((item) => {
      const fs = findFieldState(item.uuid, item.fieldName)
      return {
        fieldLabel: item.fieldLabel,
        before: beforeValues.get(item.id) || '',
        after: item.value,
        mode: (fs?.mode || 'full') as 'full' | 'patch',
        operations: fs?.operations ? [...fs.operations] : [],
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
  })
}

function rejectAll() {
  const rejectedByUser: Record<
    string,
    Record<string, { reasonForRejection: string }>
  > = {}
  for (const item of completedItems.value) {
    const fields = rejectedByUser[item.uuid] ?? {}
    fields[item.fieldName] = { reasonForRejection: '' }
    rejectedByUser[item.uuid] = fields
  }

  emit('done', {
    acceptedCount: 0,
    rejectedByUser,
    label: $t('aiAgentBatchRewriteAllRejected', 'All changes rejected'),
    agentMessage:
      'All changes were rejected by the user. Ask the user what they would like to change instead.',
    _usage: streamUsage.value,
  })
}

const selectedCount = computed(
  () => completedItems.value.filter((item) => selected[item.id]).length,
)

const applyLabel = computed(() => {
  return $t('aiAgentBatchRewriteApply', 'Apply @count of @total')
    .replace('@count', selectedCount.value.toString())
    .replace('@total', completedItems.value.length.toString())
})

onMounted(() => {
  startStreaming()
})

onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
  }
  restoreAll()
  if (markupFlushTimer) {
    clearTimeout(markupFlushTimer)
  }
})
</script>
