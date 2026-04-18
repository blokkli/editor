<template>
  <ToolCard
    v-if="phase === 'streaming'"
    icon="bk_mdi_stream"
    :title="streamingTitle"
    @cancel="onCancel"
  >
    <div class="bk-delegate-text-rewrite-progress">
      <div
        v-for="field in fieldStates"
        :key="field.uuid + field.fieldName"
        class="bk-delegate-text-rewrite-progress-item"
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

  <DiffApproval
    v-else-if="phase === 'approval' && completedItems.length > 0"
    :items="completedItems"
    @apply="applySelected"
  />

  <ToolCard
    v-if="phase === 'error'"
    icon="bk_mdi_error"
    :title="$t('aiAgentDelegateRewriteError', 'Rewriting failed')"
    @cancel="finishWithError"
  >
    <p>{{ errorMessage }}</p>
  </ToolCard>
</template>

<script lang="ts" setup>
import { useBlokkli, ref, reactive, onMounted, onBeforeUnmount } from '#imports'
import { Icon, DiffApproval } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { ComponentParams, StreamTextFieldsResult } from './index'
import type { UsageTurn } from '#blokkli/agent/shared/types'
import { itemEntityType } from '#blokkli-build/config'
import { routeStream } from '#blokkli-build/agent-client'
import type { EntityContext } from '#blokkli/types'
import { useEditableFieldOverride } from '#blokkli/editor/composables'
import { applyOperations, type ReadabilityResult } from '../helpers'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'

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
      _skipLlmResponse?: boolean
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
} = useBlokkli()

type Phase = 'streaming' | 'approval' | 'error'
const phase = ref<Phase>('streaming')
const errorMessage = ref('')
const streamUsage = ref<UsageTurn>()

// Readability retry configuration.
const MAX_READABILITY_RETRIES = 10
const isFixReadability = props.params.template === 'fix_readability'
const retryAttempt = ref(0)
const streamingTitle = ref(
  $t('aiAgentDelegateRewriteStreaming', 'Rewriting @count fields...').replace(
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
  /** Accumulated operations across all retry attempts (for details display). */
  allOperations: Array<{ search: string; replace: string }>
  currentSearch: string
  baseValue: string
  /** The original value before any streaming attempts. */
  originalBaseValue: string
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
    allOperations: [],
    currentSearch: '',
    baseValue: f.currentValue,
    originalBaseValue: f.currentValue,
  })),
)

// Track overrides for live DOM updates.
type OverrideEntry = {
  uuid: string
  fieldName: string
  element: HTMLElement | null
  setValue: (value: string) => void
  restore: () => void
  originalValue: string
}

const overrides: OverrideEntry[] = []
let abortController: AbortController | null = null

const completedItems = ref<ApprovalItem[]>([])
const beforeValues = new Map<number, string>()

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
    element: override.element,
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
 * Run readability analysis on proposed field values and return issues.
 * Analyzes raw values directly via the readability provider — no DOM dependency.
 * Uses the raw analysis result to capture scores from ALL chunks (not just hard
 * ones), so the "after" score is always available even when readability is good.
 */
async function analyzeReadability(): Promise<
  Map<
    string,
    {
      issues: ReadabilityResult[string][string]['issues']
      worstLevel: 'good' | 'ok' | 'hard'
      worstScore: number | undefined
    }
  >
> {
  // Build TextFieldValue[] from current field states' proposed values.
  const textFields: TextFieldValue[] = []
  for (const fs of fieldStates) {
    if (fs.status !== 'done') continue
    const field = props.params.fields.find(
      (f) => f.uuid === fs.uuid && f.fieldName === fs.fieldName,
    )
    if (!field) continue
    textFields.push({
      uuid: fs.uuid,
      fieldName: fs.fieldName,
      value: getProposedValue(fs),
      fieldType: field.fieldType,
      entityType: field.entityType,
      entityBundle: field.entityBundle,
    })
  }

  // Call analyzeFieldValues directly to get ALL chunks with scores.
  await props.context.app.readability.ensureInitialized()
  const rawAnalysis =
    await props.context.app.readability.analyzeFieldValues(textFields)

  const bandOrder: Record<string, number> = { easy: 0, ok: 1, hard: 2 }

  const fieldMap = new Map<
    string,
    {
      issues: ReadabilityResult[string][string]['issues']
      worstLevel: 'good' | 'ok' | 'hard'
      worstScore: number | undefined
    }
  >()

  for (const fs of fieldStates) {
    const key = fs.uuid + ':' + fs.fieldName
    const analysisKey = fs.uuid + '/' + fs.fieldName
    const fieldResult = rawAnalysis[analysisKey]
    const chunks = fieldResult?.chunks ?? []

    // Collect hard and ok chunks as issues (for retry logic).
    const issues: ReadabilityResult[string][string]['issues'] = chunks
      .filter(
        (c): c is typeof c & { score: number; band: string; impact: string } =>
          c.score !== null && (c.band === 'hard' || c.band === 'ok'),
      )
      .map((c) => ({ text: c.text, impact: c.impact, score: c.score }))

    // Find the worst chunk across ALL bands to get representative score.
    let worstBandValue = -1
    let worstScore: number | undefined
    for (const chunk of chunks) {
      if (chunk.band === null || chunk.score === null) continue
      const value = bandOrder[chunk.band] ?? 0
      if (value > worstBandValue) {
        worstBandValue = value
        worstScore = chunk.score
      }
    }

    const worstLevel: 'good' | 'ok' | 'hard' =
      worstBandValue >= 2 ? 'hard' : worstBandValue >= 1 ? 'ok' : 'good'

    fieldMap.set(key, { issues, worstLevel, worstScore })
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

/**
 * Find the nearest block-level child element within a field element that
 * contains the given text. Falls back to the field element itself.
 */
function findBlockElementForText(
  fieldElement: HTMLElement,
  text: string,
): HTMLElement {
  const blockTags = new Set([
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'LI',
    'BLOCKQUOTE',
  ])
  for (const child of fieldElement.children) {
    if (
      blockTags.has(child.tagName) &&
      child.textContent?.includes(text.slice(0, 40))
    ) {
      return child as HTMLElement
    }
  }
  return fieldElement
}

/** Track the last search target per field to avoid redundant scrolls. */
let lastScrollTarget = ''

function scrollToFieldText(uuid: string, fieldName: string, text?: string) {
  const override = findOverride(uuid, fieldName)
  if (!override?.element) {
    // Fall back to block-level scroll.
    eventBus.emit('scrollIntoView', { uuid, immediate: false })
    return
  }
  const target =
    text && override.element
      ? findBlockElementForText(override.element, text)
      : override.element
  const key =
    uuid + ':' + fieldName + ':' + (target?.textContent?.slice(0, 20) || '')
  if (key === lastScrollTarget) return
  lastScrollTarget = key
  eventBus.emit('scrollIntoView', { element: target, immediate: false })
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
        lastScrollTarget = ''
        scrollToFieldText(parsed.uuid, parsed.fieldName)
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
          // Scroll to the target text when the search target changes.
          if (parsed.search !== fs.currentSearch) {
            scrollToFieldText(parsed.uuid, parsed.fieldName, parsed.search)
          }
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
    const response = await fetch(routeStream, {
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
        label: $t('aiAgentDelegateRewriteCancelled', 'Rewriting cancelled'),
        agentMessage: 'Rewriting was cancelled by the user.',
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
 * Analyzes proposed values directly via the readability provider.
 */
async function readabilityRetryLoop(authToken: string) {
  for (let attempt = 0; attempt < MAX_READABILITY_RETRIES; attempt++) {
    streamingTitle.value = $t(
      'aiAgentDelegateRewriteChecking',
      'Checking readability...',
    )

    // Run readability analysis on proposed values.
    const analysis = await analyzeReadability()

    // Store scores and classify fields.
    type FieldCheck = {
      fs: FieldState
      fieldType: 'plain' | 'markup'
      proposedValue: string
      level: 'good' | 'ok' | 'hard'
      score: number | undefined
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
      const score = entry?.worstScore
      const issues = entry?.issues ?? []
      const proposedValue = getProposedValue(fs)

      const check: FieldCheck = {
        fs,
        fieldType: field.fieldType,
        proposedValue,
        level,
        score,
        issues,
      }

      if (level === 'hard' || level === 'ok') {
        failing.push(check)
      } else {
        passing.push(check)
      }
    }

    // All pass — done.
    if (failing.length === 0) break

    // Max retries reached — show what we have.
    if (attempt === MAX_READABILITY_RETRIES - 1) break

    // Build structured retry data for the template.
    const retryFieldsData = failing.map((f, i) => ({
      fieldIndex: i,
      fieldLabel: f.fs.fieldLabel,
      originalValue: f.fs.originalBaseValue,
      previousAttempt: f.proposedValue,
      score: f.score,
    }))

    const passingFieldsData = passing.map((p) => ({
      fieldLabel: p.fs.fieldLabel,
      value: p.proposedValue,
      score: p.score,
    }))

    // Reset failing field states for retry, accumulating operations from this attempt.
    for (const f of failing) {
      f.fs.allOperations.push(...f.fs.operations)
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
      score: number
    }> = []
    for (let i = 0; i < failing.length; i++) {
      for (const issue of failing[i]!.issues) {
        retryIssues.push({
          fieldIndex: i,
          text: issue.text,
          impact: issue.impact || 'critical',
          score: issue.score ?? 0,
        })
      }
    }

    streamingTitle.value = $t(
      'aiAgentDelegateRewriteRetrying',
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
      scoreLabel: props.context.app.readability.scoreLabel.value,
      scoreReference: props.context.app.readability.getAgentContext(),
      retryFields: retryFieldsData,
      passingFields: passingFieldsData,
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

function restoreAll() {
  for (const override of overrides) {
    override.restore()
  }
}

function onCancel() {
  if (abortController) {
    abortController.abort()
  }
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
    label: $t('aiAgentDelegateRewriteFailed', 'Rewriting failed'),
    agentMessage: `Rewriting failed: ${errorMessage.value}`,
    _usage: streamUsage.value,
  })
}

async function applySelected(data: {
  selected: Record<number, boolean>
  reasons: Record<number, string>
}) {
  const { selected, reasons } = data
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

  const _details: StreamTextFieldsDetailItem[] = completedItems.value
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

async function _rejectAll() {
  await state.flushDirty()

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

onMounted(() => {
  startStreaming()
})

onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
  }
  // During streaming, setValue updated mutatedItemProps — restore to original.
  // During approval, mutatedItemProps is already at original (from
  // transitionToApproval's restoreAll), so we skip to avoid the flash.
  if (phase.value === 'streaming') {
    restoreAll()
  }
  // Force re-render any blocks whose DOM was manipulated via setDiffHtml.
  // No-op on the apply path (already flushed inside mutateWithLoadingState).
  state.flushDirty()
  if (markupFlushTimer) {
    clearTimeout(markupFlushTimer)
  }
})
</script>
