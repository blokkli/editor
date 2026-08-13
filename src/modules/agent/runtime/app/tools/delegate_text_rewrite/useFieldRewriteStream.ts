import { useBlokkli, ref, reactive } from '#imports'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { ComponentParams } from './index'
import type { UsageTurn } from '#blokkli/agent/shared/types'
import { routeStream } from '#blokkli-build/agent-client'
import type { EntityContext } from '#blokkli/types'
import { useEditableFieldOverride } from '#blokkli/editor/composables'
import { applyOperations, resolveHost as resolveBlockHost } from '../helpers'
import { worstReadability, type ReadabilityResult } from '../readability'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'

export type Phase = 'streaming' | 'approval' | 'error'

export type FieldState = {
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

type OverrideEntry = {
  uuid: string
  fieldName: string
  element: HTMLElement | null
  setValue: (value: string) => void
  restore: () => void
  /**
   * The field's value as STORED, captured before the rewrite began.
   *
   * Deliberately the raw value and not the rendered one: the component diffs
   * against this and a partial acceptance reassembles from it, so a rendered
   * value here would persist the backend's render-time markup.
   */
  rawOriginalValue: string
}

/**
 * Owns the streaming subsystem of the `delegate_text_rewrite` tool: SSE transport,
 * the event state machine, markup buffering, live-DOM overrides, and the readability
 * retry loop. The component keeps the approval UI and emits.
 *
 * `phase`/`errorMessage` live here because the streaming code is their primary
 * writer (and `phase` doubles as a control-flow signal — e.g. an SSE `error` event
 * sets `phase='error'` mid-stream); owning them keeps that flow intact. The
 * composable never calls `emit`: a user cancel surfaces via `start()`'s
 * `{ cancelled }` result, and the success fall-through invokes the injected
 * `onComplete` (the component's `transitionToApproval`).
 */
export function useFieldRewriteStream(options: {
  context: McpToolContext
  params: ComponentParams
  onComplete: () => void
}) {
  const { context, params, onComplete } = options

  const blokkli = useBlokkli()
  const { $t, types, eventBus } = blokkli

  const phase = ref<Phase>('streaming')
  const errorMessage = ref('')
  const streamUsage = ref<UsageTurn>()

  // Readability retry configuration.
  const MAX_READABILITY_RETRIES = 10
  const isFixReadability = params.template === 'fix_readability'
  const retryAttempt = ref(0)
  const streamingTitle = ref(
    $t('aiAgentDelegateRewriteStreaming', 'Rewriting @count fields', {
      more: true,
    }).replace('@count', String(params.fields.length)),
  )

  function resolveHost(uuid: string): EntityContext | null {
    const host = resolveBlockHost(blokkli, uuid)
    return host
      ? { type: host.entityType, bundle: host.bundle, uuid: host.uuid }
      : null
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

  const fieldStates = reactive<FieldState[]>(
    params.fields.map((f) => ({
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
  const overrides: OverrideEntry[] = []
  let abortController: AbortController | null = null

  /** Set when the user aborts mid-stream; surfaced via `start()`. */
  let cancelled = false

  // Create overrides upfront during setup for all fields.
  for (const field of params.fields) {
    const host = resolveHost(field.uuid)
    if (!host) continue
    const override = useEditableFieldOverride(field.fieldName, host)
    overrides.push({
      uuid: field.uuid,
      fieldName: field.fieldName,
      element: override.element,
      setValue: override.setValue,
      restore: override.restore,
      rawOriginalValue: override.rawOriginalValue,
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
    const field = params.fields.find(
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
      const field = params.fields.find(
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
    const rawAnalysis =
      await context.app.readability.analyzeFieldValues(textFields)

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
          (
            c,
          ): c is typeof c & { score: number; band: string; impact: string } =>
            c.score !== null && (c.band === 'hard' || c.band === 'ok'),
        )
        .map((c) => ({ text: c.text, impact: c.impact, score: c.score }))

      // Reduce to the single worst chunk for a representative level + score.
      // A field too short to score yields no worst chunk → treated as "good"
      // (nothing to retry) with no score.
      const worst = worstReadability(chunks)
      const worstLevel = worst?.level ?? 'good'
      const worstScore = worst?.score

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
      streamUsage.value.cacheCreationInputTokens +=
        usage.cacheCreationInputTokens
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
          template: params.template,
          templateParams,
          fields: requestFields,
          pageContext: context.pageContext,
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
        // User cancelled — restore and signal the cancellation up to start().
        restoreAll()
        cancelled = true
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
        'checkingReadability',
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
        const field = params.fields.find(
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
        'Retrying @count fields (attempt @attempt)',
        { more: true },
      )
        .replace('@count', String(failing.length))
        .replace('@attempt', String(retryAttempt.value + 1))

      // Get a fresh auth token for the retry.
      let retryToken = authToken
      if (context.adapter.getAgentAuthToken) {
        const fresh = await context.adapter.getAgentAuthToken()
        if (fresh) retryToken = fresh
      }

      const retrySuccess = await fetchStream(retryToken, retryFields, {
        issues: retryIssues,
        scoreLabel: context.app.readability.scoreLabel.value,
        scoreReference: context.app.readability.getAgentContext(),
        retryFields: retryFieldsData,
        passingFields: passingFieldsData,
      })

      if (!retrySuccess) return
    }
  }

  /** Restore all live-DOM overrides to their original values. */
  function restoreAll() {
    for (const override of overrides) {
      override.restore()
    }
  }

  /**
   * Orchestrate the full streaming flow: auth → initial stream → optional
   * readability retry loop → `onComplete`. Resolves with whether the user
   * cancelled mid-stream (the component emits the cancelled result).
   */
  async function start(): Promise<{ cancelled: boolean }> {
    // Get auth token.
    let authToken: string | null = null
    if (context.adapter.getAgentAuthToken) {
      authToken = await context.adapter.getAgentAuthToken()
    }
    if (!authToken) {
      phase.value = 'error'
      errorMessage.value = 'Failed to get authentication token'
      return { cancelled }
    }

    // First pass: stream all fields.
    const requestFields = params.fields.map((f) => ({
      uuid: f.uuid,
      fieldName: f.fieldName,
      currentValue: f.currentValue,
      fieldType: f.fieldType,
    }))

    const success = await fetchStream(
      authToken,
      requestFields,
      params.templateParams,
    )
    if (!success) return { cancelled }

    // For fix_readability: verify and retry if needed.
    if (isFixReadability) {
      await readabilityRetryLoop(authToken)
      // If cancelled or errored during retry, don't transition to approval.
      if (phase.value !== 'streaming') return { cancelled }
    }

    onComplete()
    return { cancelled }
  }

  /** Abort the in-flight request (used on user cancel). */
  function abort() {
    if (abortController) {
      abortController.abort()
    }
  }

  /** Abort and clear the markup debounce timer (used on unmount). */
  function dispose() {
    abort()
    if (markupFlushTimer) {
      clearTimeout(markupFlushTimer)
    }
  }

  return {
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
  }
}
