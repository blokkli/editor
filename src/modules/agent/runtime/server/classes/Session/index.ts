import { z } from 'zod'
import type { Peer } from 'crossws'
import type {
  PageContext,
  ClientToolDefinition,
  ServerToolMetadata,
  ClientPlanState,
  ClientPlanStep,
  ConversationStateSnapshot,
  GenericContentBlock,
  GenericTextBlock,
  GenericSkillBlock,
  MockScript,
  PageState,
  SelectedBlock,
  Transcript,
} from '../../../shared/types'
import { coerceStringifiedParams } from '../../../shared/toolParams'
import { ToolResult } from '../../../shared/toolResult'
import {
  buildSystemPrompt,
  buildSystemPromptEntries,
} from '../../helpers/agentPrompt'
import type { ActivePlanContext } from '../../system-prompts/types'
import {
  createMockProvider,
  provider as defaultProvider,
  models,
} from '#blokkli-build/agent-server'
import type { AIProvider } from '../../providers/types'
import { send } from '../../helpers/socket'
import {
  ConversationHistory,
  type VolatileLookup,
} from '../ConversationHistory'
import {
  UserPromptMessage,
  AssistantMessage,
  ToolRelayMessage,
} from '../ConversationMessage'
import { resolveSkills } from '../../helpers/skills'
import { classifyError } from '../../helpers/errors'
import { computeStateHash, verifyStateHash } from '../../helpers/security'
import { validateMessages } from '../../helpers/messages'
import { formatSelectionMarker } from '../../helpers/selectionMarker'
import { formatPageStateNote } from '../../helpers/pageStateNote'
import { getDefaultModel, createUsageTurn } from '../../helpers/models'
import type {
  ServerPlan,
  ServerSideTool,
  ServerToolContext,
  ToolDefinitionContext,
  ToolResultEntry,
} from '../../server-tools'
import type { ResolvedSkill } from '../../skills/types'
import { buildDefinition, stripSchemaOverhead } from '../../server-tools'
import { StreamAccumulator } from '../StreamAccumulator'

import loadSkillTool from '../../server-tools/load_skills'
import loadToolsTool from '../../server-tools/load_tools'
import createPlanTool from '../../server-tools/create_plan'
import completePlanStepTool from '../../server-tools/complete_plan_step'

const serverTools: ServerSideTool[] = [
  loadSkillTool,
  loadToolsTool,
  createPlanTool,
  completePlanStepTool,
]

/** All inputs of a `start` message, minus the peer. */
export type SessionStartOptions = {
  prompt: string
  apiKey: string
  authSecret: string
  selectedBlocks?: SelectedBlock[]
  /** Live editor state at send time; merged into the session's page context. */
  pageState?: PageState
  autoLoadTools?: string[]
  autoLoadSkills?: string[]
  preSeededResults?: {
    toolName: string
    params: Record<string, unknown>
    result: unknown
  }[]
  autoExecuteTools?: {
    toolName: string
    params: Record<string, unknown>
  }[]
  rollbackToUserMessageIndex?: number
}

/** The volatile subset of a page context, in the per-message wire shape. */
function pageStateOfContext(ctx: PageContext): PageState {
  return {
    editMode: ctx.editMode,
    entityLanguage: ctx.entityLanguage,
    isPublished: ctx.isPublished,
    title: ctx.title,
  }
}

// ============================================================================
// Session class
// ============================================================================

export class Session {
  /** The single, immutable source of truth for the conversation. */
  private history = new ConversationHistory()
  pendingToolCalls = new Map<
    string,
    {
      resolve: (result: {
        result: unknown
        error?: string
        skipLlmResponse?: boolean
      }) => void
      reject: (error: Error) => void
    }
  >()

  abortController: AbortController | null = null
  isProcessing = false

  /** Names of eager tools sent to the LLM on every turn */
  toolNames: string[] = []
  /** Names of lazy tools held back until activated via load_tools */
  lazyToolNames: string[] = []
  /** Names of lazy tools that have been activated via load_tools */
  activatedLazyTools = new Set<string>()
  /** Names of skills that have been loaded via load_skills */
  loadedSkills = new Set<string>()
  /** Page context received from client on init, volatile fields updated per message */
  pageContext?: PageContext

  /**
   * The volatile page state as last announced to the LLM (via init's system
   * prompt or a previous `[Editor context …]` note). Diffing against it
   * decides whether the next user message needs a note. NOT rolled back with
   * history truncation on retry — a flip-and-back could emit a note about a
   * change the truncated transcript never saw, which is harmless.
   */
  private lastAnnouncedPageState?: PageState
  /**
   * Set after a conversation restore: the restored history may have been
   * written under a different mode/language (the persistence snapshot stores
   * no page context), so the next user message carries a full context note
   * instead of a diff.
   */
  private stateBaselineUnknown = false

  /** Current plan (null when no plan is active) */
  plan: ServerPlan | null = null
  /** Whether any real work (non-server tool calls) happened since the last plan step started */
  planStepHasWork = false
  /** Pending plan approval promise resolver */
  pendingPlanApproval: { resolve: (approved: boolean) => void } | null = null
  /** Last generic tool definitions for transcript */
  private lastTools: ClientToolDefinition[] = []
  /** Last raw request payload for transcript (dev only) */
  private lastDebugPayload: unknown = null

  /**
   * Active LLM provider for this session. Defaults to the build-configured
   * provider; `useMockProvider()` swaps in a deterministic mock for E2E tests
   * (gated upstream by the module's `enableMock` flag).
   */
  private provider: AIProvider = defaultProvider

  /** Bundled tool metadata map for server-side resolution */
  private bundledToolMap: Map<string, ServerToolMetadata>
  /** Cache for resolved JSON Schemas (Zod→JSON Schema is deterministic) */
  private jsonSchemaCache = new Map<string, Record<string, unknown>>()

  constructor(toolDefinitions: ServerToolMetadata[]) {
    this.bundledToolMap = new Map(toolDefinitions.map((t) => [t.name, t]))
  }

  /**
   * Resolve a single tool name into a ClientToolDefinition.
   * Resolves from bundled metadata. Caches the JSON Schema conversion.
   */
  resolveToolDefinition(name: string): ClientToolDefinition | undefined {
    const bundled = this.bundledToolMap.get(name)
    if (!bundled) return undefined

    let inputSchema = this.jsonSchemaCache.get(name)
    if (!inputSchema) {
      inputSchema = stripSchemaOverhead(
        z.toJSONSchema(bundled.paramsSchema),
      ) as Record<string, unknown>
      this.jsonSchemaCache.set(name, inputSchema)
    }
    return {
      name: bundled.name,
      description: bundled.description,
      input_schema: inputSchema,
      ...(bundled.lazy ? { lazy: true as const } : {}),
      category: bundled.category,
      ...(bundled.volatile ? { volatile: true as const } : {}),
    }
  }

  /**
   * Resolve multiple tool names into ClientToolDefinition objects.
   * Skips names that cannot be resolved.
   */
  resolveToolDefinitions(names: string[]): ClientToolDefinition[] {
    const result: ClientToolDefinition[] = []
    for (const name of names) {
      const def = this.resolveToolDefinition(name)
      if (def) {
        result.push(def)
      }
    }
    return result
  }

  /**
   * Look up name + description for a tool.
   */
  private getToolSummary(
    name: string,
  ): { name: string; description: string } | undefined {
    const bundled = this.bundledToolMap.get(name)
    if (!bundled) return undefined
    return { name: bundled.name, description: bundled.description }
  }

  /**
   * Whether a client tool may be offered/executed in the current edit mode.
   * Tools without bundled metadata (or without declared modes) are allowed —
   * robustness over strictness for project tools the build didn't annotate.
   */
  private toolAllowedInMode(name: string): boolean {
    const modes = this.bundledToolMap.get(name)?.modes
    if (!modes?.length) return true
    const editMode = this.pageContext?.editMode
    return !editMode || modes.includes(editMode)
  }

  // --------------------------------------------------------------------------
  // Public methods
  // --------------------------------------------------------------------------

  /**
   * Replace the LLM provider with a deterministic mock that replays the given
   * script. Caller (the WS handler) is responsible for gating this on the
   * module's `enableMock` flag. Resetting to the default provider isn't
   * supported on purpose: in test scenarios, sessions are short-lived and a
   * fresh connection always re-creates the session.
   */
  useMockProvider(script: MockScript): void {
    if (!createMockProvider) return
    this.provider = createMockProvider(script)
  }

  /**
   * Whether this session is currently driven by the mock provider. The WS
   * handler uses this to skip the real-LLM `apiKey` precondition on `start`.
   */
  get isMocked(): boolean {
    return this.provider.name === 'mock'
  }

  init(toolNames: string[], pageContext: PageContext): void {
    // Partition into eager/lazy using bundled metadata
    this.toolNames = []
    this.lazyToolNames = []
    for (const name of toolNames) {
      const bundled = this.bundledToolMap.get(name)
      const isLazy = bundled?.lazy ?? false
      if (isLazy) {
        this.lazyToolNames.push(name)
      } else {
        this.toolNames.push(name)
      }
    }

    this.activatedLazyTools = new Set()
    this.loadedSkills = new Set()
    this.pageContext = pageContext
    // The init context IS what the LLM gets told (via the system prompt), so
    // it is the baseline future per-message states diff against.
    this.lastAnnouncedPageState = pageStateOfContext(pageContext)
    this.stateBaselineUnknown = false
  }

  start(peer: Peer, options: SessionStartOptions): void {
    if (this.isProcessing) {
      send(peer, {
        type: 'error',
        errorType: 'bad_request',
        message: 'Agent is already processing a request',
      })
      return
    }

    if (options.rollbackToUserMessageIndex !== undefined) {
      try {
        this.truncateAtUserMessage(options.rollbackToUserMessageIndex)
      } catch (e) {
        send(peer, {
          type: 'error',
          errorType: 'bad_request',
          message:
            e instanceof Error ? e.message : 'Rollback target out of range',
        })
        return
      }
    }

    // Claim the session synchronously, before the un-awaited runAgentLoop call.
    // runAgentLoop does async work (pre-seeded results, auto-executed tools that
    // await client round-trips) before it would otherwise set this flag, leaving
    // a window in which a second `start` could pass the guard above and run a
    // concurrent loop over the same `this.messages`.
    this.isProcessing = true

    this.runAgentLoop(peer, options)
  }

  /**
   * Remove the Nth real user turn (0-based) and every message after it.
   * "Real user turn" excludes tool-result relays. Throws if the index is
   * out of range — typically because the target turn has been pruned away.
   */
  private truncateAtUserMessage(targetIndex: number): void {
    // Throws if out of range — leaves state untouched in that case.
    this.history.truncateAtUserTurn(targetIndex)

    // Caches tied to the truncated turns are no longer valid.
    this.lastTools = []
    this.lastDebugPayload = null
    // Cancel any pending tool calls or plan approval — the conversation
    // those belonged to no longer exists.
    for (const pending of this.pendingToolCalls.values()) {
      pending.reject(new Error('Rollback cancelled pending tool call'))
    }
    this.pendingToolCalls.clear()
    if (this.pendingPlanApproval) {
      this.pendingPlanApproval.resolve(false)
      this.pendingPlanApproval = null
    }
  }

  resolveToolResult(
    callId: string,
    result: { result: unknown; error?: string; skipLlmResponse?: boolean },
  ): void {
    const pending = this.pendingToolCalls.get(callId)
    if (pending) {
      pending.resolve(result)
    }
  }

  cancel(peer: Peer): void {
    this.abortController?.abort()
    // Reject all pending tool call promises so the agent loop doesn't hang
    // waiting for a client response that will never come.
    for (const pending of this.pendingToolCalls.values()) {
      pending.reject(new Error('Cancelled'))
    }
    this.pendingToolCalls.clear()
    // Reject pending plan approval so the agent loop doesn't hang
    if (this.pendingPlanApproval) {
      this.pendingPlanApproval.resolve(false)
      this.pendingPlanApproval = null
    }
    send(peer, { type: 'done' })
  }

  acceptChanges(peer: Peer, authSecret: string): void {
    this.safePushUserMessage(`[System: Changes accepted and applied.]`)
    send(peer, { type: 'done', message: 'Changes accepted' })
    this.sendConversationState(peer, authSecret)
  }

  rejectChanges(peer: Peer, authSecret: string): void {
    this.safePushUserMessage(
      `[System: Changes rejected. All pending changes have been reverted. The page is back to its previous state.]`,
    )
    send(peer, { type: 'done', message: 'Changes rejected' })
    this.sendConversationState(peer, authSecret)
  }

  approvePlan(): void {
    if (this.pendingPlanApproval) {
      this.pendingPlanApproval.resolve(true)
      this.pendingPlanApproval = null
    }
  }

  rejectPlan(): void {
    if (this.pendingPlanApproval) {
      this.pendingPlanApproval.resolve(false)
      this.pendingPlanApproval = null
    }
  }

  getTranscript(peer: Peer): void {
    send(peer, {
      type: 'transcript',
      transcript: this.buildTranscript(),
    })
  }

  newConversation(peer: Peer, authSecret: string): void {
    this.abortController?.abort()
    // Reject any in-flight tool calls so the agent loop doesn't hang and any
    // late tool_result the client sends for them is a no-op against the fresh
    // session (resolveToolResult silently ignores unknown callIds).
    for (const pending of this.pendingToolCalls.values()) {
      pending.reject(new Error('Cancelled'))
    }
    this.pendingToolCalls.clear()
    this.history.clear()
    this.lastTools = []
    this.lastDebugPayload = null
    this.activatedLazyTools.clear()
    this.loadedSkills.clear()
    this.plan = null
    if (this.pendingPlanApproval) {
      this.pendingPlanApproval.resolve(false)
      this.pendingPlanApproval = null
    }
    // A fresh conversation has nothing to contrast a "changed" note against —
    // re-baseline on the current context so no stale note leaks into turn 1.
    if (this.pageContext) {
      this.lastAnnouncedPageState = pageStateOfContext(this.pageContext)
    }
    this.stateBaselineUnknown = false
    send(peer, { type: 'done' })
    // Send empty state so adapter clears persisted data
    this.sendConversationState(peer, authSecret)
  }

  cleanup(): void {
    this.abortController?.abort()
    for (const pending of this.pendingToolCalls.values()) {
      pending.reject(new Error('Session closed'))
    }
    this.pendingToolCalls.clear()
    if (this.pendingPlanApproval) {
      this.pendingPlanApproval.resolve(false)
      this.pendingPlanApproval = null
    }
    this.plan = null
    this.history.clear()
    this.toolNames = []
    this.lazyToolNames = []
    this.activatedLazyTools.clear()
    this.loadedSkills.clear()
    this.pageContext = undefined
  }

  /**
   * Build a persistence snapshot and send it to the client.
   */
  sendConversationState(peer: Peer, authSecret: string): void {
    const state = this.getConversationStateForPersistence(authSecret)
    send(peer, { type: 'conversation_state', state })
  }

  /**
   * Create an aggressively pruned snapshot of the current conversation
   * for client-side persistence.
   */
  getConversationStateForPersistence(
    authSecret: string,
  ): ConversationStateSnapshot {
    const prunedMessages = this.history.projectForPersistence()
    const activatedLazyTools = Array.from(this.activatedLazyTools)
    const hash = computeStateHash(
      prunedMessages,
      activatedLazyTools,
      authSecret,
    )
    return {
      messages: prunedMessages,
      activatedLazyTools,
      hash,
    }
  }

  /**
   * Restore conversation state from a client-provided snapshot.
   * Verifies HMAC integrity before loading.
   */
  restoreConversation(
    state: ConversationStateSnapshot,
    authSecret: string,
  ): {
    success: boolean
    reason?: string
  } {
    if (!verifyStateHash(state, authSecret)) {
      return { success: false, reason: 'Invalid state hash' }
    }

    const issues = validateMessages(state.messages)
    if (issues.length > 0) {
      return { success: false, reason: 'Invalid message structure' }
    }

    this.history.replaceAll(state.messages)
    this.lastTools = []

    // Only restore lazy tools that still exist in the current tool set
    const validLazyToolNames = new Set(this.lazyToolNames)
    this.activatedLazyTools = new Set(
      state.activatedLazyTools.filter((name) => validLazyToolNames.has(name)),
    )

    this.plan = null

    // The restored history may have been written under a different edit mode
    // or language — the snapshot deliberately stores no page context. The next
    // user message must carry a full `[Editor context …]` note instead of a
    // diff so the LLM knows where the conversation resumed.
    this.stateBaselineUnknown = true

    return { success: true }
  }

  // --------------------------------------------------------------------------
  // Private methods
  // --------------------------------------------------------------------------

  /**
   * Convert the server plan to a client-facing plan (strips descriptions).
   */
  private toClientPlan(): ClientPlanState | null {
    if (!this.plan) return null
    return {
      title: this.plan.title,
      steps: this.plan.steps.map(
        (s): ClientPlanStep => ({
          label: s.label,
          status: s.status,
        }),
      ),
    }
  }

  /**
   * Build an ActivePlanContext from the current plan state,
   * or undefined if no plan step is in progress.
   */
  private getActivePlanContext(): ActivePlanContext | undefined {
    const currentStep = this.plan?.steps.find((s) => s.status === 'in_progress')
    if (!this.plan || !currentStep) return undefined
    return {
      title: this.plan.title,
      totalSteps: this.plan.steps.length,
      completedSteps: this.plan.steps.filter((s) => s.status === 'completed')
        .length,
      currentStep: {
        label: currentStep.label,
        description: currentStep.description,
      },
      remainingSteps: this.plan.steps
        .filter((s) => s.status === 'pending')
        .map((s) => s.label),
    }
  }

  /**
   * Wait for the user to approve or reject the plan.
   */
  private waitForPlanApproval(): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingPlanApproval = { resolve }
    })
  }

  private async runAgentLoop(
    peer: Peer,
    options: SessionStartOptions,
  ): Promise<void> {
    const {
      prompt,
      apiKey,
      authSecret,
      selectedBlocks,
      pageState,
      autoLoadTools,
      autoLoadSkills,
      preSeededResults,
      autoExecuteTools,
    } = options

    if (this.toolNames.length === 0) {
      this.isProcessing = false
      send(peer, {
        type: 'error',
        errorType: 'bad_request',
        message:
          'No tools available. Client must send init message with tools first.',
      })
      return
    }

    if (!this.pageContext) {
      this.isProcessing = false
      send(peer, {
        type: 'error',
        errorType: 'bad_request',
        message:
          'No page context available. Client must send init message with pageContext first.',
      })
      return
    }

    // Apply the volatile editor state carried by this message BEFORE anything
    // reads this.pageContext: resolveSkills below hands the full context to
    // every skill, and the per-turn system prompt (rebuilt from this.pageContext
    // each round) must reflect e.g. a readonly→editing flip from taking
    // ownership. The note announcing the change to the LLM is prepended to the
    // user message further down.
    let pageStateNote: string | null = null
    if (pageState) {
      // On the first message of a fresh conversation there is nothing to
      // contrast a "changed" note against — the system prompt (built from the
      // merged context below) is simply correct from the start.
      if (this.history.length > 0) {
        pageStateNote = formatPageStateNote(
          this.lastAnnouncedPageState,
          pageState,
          { baselineUnknown: this.stateBaselineUnknown },
        )
      }
      Object.assign(this.pageContext, {
        editMode: pageState.editMode,
        entityLanguage: pageState.entityLanguage,
        isPublished: pageState.isPublished,
        title: pageState.title,
      })
      this.lastAnnouncedPageState = pageState
      this.stateBaselineUnknown = false
    }

    // Resolve skills for this page context
    const resolvedSkills = resolveSkills(this.pageContext)

    // Auto-activate lazy tools requested by the prompt
    if (autoLoadTools?.length) {
      for (const name of autoLoadTools) {
        if (
          this.lazyToolNames.includes(name) &&
          !this.activatedLazyTools.has(name)
        ) {
          this.activatedLazyTools.add(name)
        }
      }
    }

    // Auto-load skills requested by the prompt
    const autoLoadedSkillBlocks: GenericSkillBlock[] = []
    if (autoLoadSkills?.length) {
      for (const skillName of autoLoadSkills) {
        const skill = resolvedSkills.find((s) => s.name === skillName)
        if (!skill || this.loadedSkills.has(skill.name)) continue
        this.loadedSkills.add(skill.name)
        // Auto-activate tools declared by the skill
        for (const toolName of skill.tools) {
          if (
            this.lazyToolNames.includes(toolName) &&
            !this.activatedLazyTools.has(toolName)
          ) {
            this.activatedLazyTools.add(toolName)
          }
        }
        autoLoadedSkillBlocks.push({
          type: 'skill',
          name: skill.name,
          text: `# Skill: ${skill.name}\n\n${skill.content}`,
        })
      }
    }

    // Build initial user message with context. Order: state note, selection
    // marker, prompt — both ride on user-written messages only.
    const userParts: string[] = []

    if (pageStateNote) {
      userParts.push(pageStateNote)
    }

    const selectionMarker = formatSelectionMarker(selectedBlocks)
    if (selectionMarker) {
      userParts.push(selectionMarker)
    }

    userParts.push(prompt)

    const userMessage =
      autoLoadedSkillBlocks.length > 0
        ? new UserPromptMessage([
            ...autoLoadedSkillBlocks,
            { type: 'text', text: userParts.join('\n\n') },
          ])
        : new UserPromptMessage(userParts.join('\n\n'))
    this.history.append(userMessage)

    // Inject pre-seeded tool results as synthetic assistant/user message pairs.
    // These appear in the conversation history so the LLM sees the analysis
    // without needing to call the tools itself.
    if (preSeededResults?.length) {
      for (let i = 0; i < preSeededResults.length; i++) {
        const preSeeded = preSeededResults[i]!
        const toolUseId = `preseed_${i}`
        this.pushToolExchange(
          toolUseId,
          preSeeded.toolName,
          preSeeded.params,
          ToolResult.fromWire(JSON.stringify(preSeeded.result)),
        )
      }
    }

    // Auto-execute tools: dispatch to client via normal tool_call flow and
    // wait for results before the LLM loop starts.
    let allAutoToolsSkipLlm = false
    if (autoExecuteTools?.length) {
      let hasErrors = false
      let allSkip = true
      for (let i = 0; i < autoExecuteTools.length; i++) {
        const autoTool = autoExecuteTools[i]!
        const callId = `auto_${i}`
        const toolUseId = `auto_tu_${i}`

        // Same mode gate as LLM-initiated tool calls: prompt templates are
        // client-trusted, but the template may predate a mode change. The
        // state merge above precedes this, so the check sees the fresh mode.
        if (!this.toolAllowedInMode(autoTool.toolName)) {
          hasErrors = true
          allSkip = false
          this.pushToolExchange(
            toolUseId,
            autoTool.toolName,
            autoTool.params,
            ToolResult.error(
              `The tool "${autoTool.toolName}" is not available in the current edit mode ("${this.pageContext?.editMode}").`,
            ),
          )
          continue
        }

        send(peer, {
          type: 'tool_call',
          callId,
          tool: autoTool.toolName,
          params: autoTool.params,
        })

        try {
          const clientResult = await this.waitForToolResult(callId)

          let result: ToolResult
          if (clientResult.error) {
            hasErrors = true
            allSkip = false
            result = ToolResult.error(clientResult.error)
          } else {
            if (!clientResult.skipLlmResponse) {
              allSkip = false
            }
            result = ToolResult.fromClientResult(clientResult.result)
          }
          this.pushToolExchange(
            toolUseId,
            autoTool.toolName,
            autoTool.params,
            result,
          )
        } catch {
          hasErrors = true
          allSkip = false
          // Client disconnected or cancelled — inject error result so the
          // LLM can see the failure and decide what to do.
          this.pushToolExchange(
            toolUseId,
            autoTool.toolName,
            autoTool.params,
            ToolResult.error('Auto-executed tool call was cancelled.'),
          )
        }
      }
      allAutoToolsSkipLlm = allSkip && !hasErrors
    }

    // If all auto-execute tools succeeded and requested skipping the LLM
    // response, send done immediately without entering the LLM loop.
    if (allAutoToolsSkipLlm) {
      send(peer, { type: 'done' })
      this.sendConversationState(peer, authSecret)
      this.isProcessing = false
      return
    }

    this.abortController = new AbortController()
    // isProcessing was already set in start(); the early-skip path above and the
    // finally block both reset it to false.
    let toolCallCounter = 0
    let planRetryCount = 0
    let streamRetryCount = 0
    const MAX_STREAM_RETRIES = 1

    // Track consecutive identical tool calls to detect loops
    let lastToolCallKey = ''
    let consecutiveIdenticalCalls = 0
    const MAX_IDENTICAL_CALLS = 2

    // Track consecutive client-tool calls rejected by server-side schema
    // validation. These are hidden from the UI and retried silently; after this
    // many in a row we let the next one through so the failure surfaces.
    let consecutiveValidationFailures = 0
    const MAX_HIDDEN_VALIDATION_FAILURES = 2

    try {
      while (true) {
        // Check for abort
        if (this.abortController.signal.aborted) {
          break
        }

        // Send thinking indicator
        send(peer, { type: 'thinking' })

        // Accumulate streamed text + tool_use deltas into completed content
        // blocks for this assistant turn. `assistantContent` aliases the
        // accumulator's live block array so the dispatch/commit code below can
        // keep appending to (and resetting) it directly.
        const accumulator = new StreamAccumulator()
        const assistantContent = accumulator.blocks
        const toolResults: Array<{
          type: 'tool_result'
          tool_use_id: string
          content: string
          is_error?: boolean
        }> = []
        const extraBlocks: (GenericTextBlock | GenericSkillBlock)[] = []

        // Flag set by create_plan: messages already committed, skip normal commit
        let messagesCommittedByPlanTool = false

        // Everything the LLM gets to see this turn is filtered by the CURRENT
        // edit mode — init sends the client's full capability set, and the
        // mode can change between messages (taking ownership, moving to a
        // translation). The activated set itself is never mutated by the
        // filter: a tool loaded in one mode comes back when the mode returns.
        const eligibleLazyToolNames = this.lazyToolNames.filter((name) =>
          this.toolAllowedInMode(name),
        )

        // Resolve eager tools from names
        const eagerTools = this.resolveToolDefinitions(
          this.toolNames.filter((name) => this.toolAllowedInMode(name)),
        )

        // Resolve activated lazy tools
        const activatedToolNames = eligibleLazyToolNames.filter((name) =>
          this.activatedLazyTools.has(name),
        )
        const activatedTools = this.resolveToolDefinitions(activatedToolNames)

        // Build server-side tool definitions for this turn
        const unloadedLazyToolNames = eligibleLazyToolNames.filter(
          (name) => !this.activatedLazyTools.has(name),
        )
        const unloadedLazyTools = unloadedLazyToolNames
          .map((name) => this.getToolSummary(name))
          .filter(
            (s): s is { name: string; description: string } => s !== undefined,
          )
        const defCtx: ToolDefinitionContext = {
          resolvedSkills,
          plan: this.plan,
          unloadedLazyTools,
          // Mode-filtered so load_tools' description only advertises tools
          // that are actually loadable right now. The runtime activation
          // whitelist (ServerToolContext.lazyToolNames) deliberately stays the
          // full session list.
          lazyToolNames: eligibleLazyToolNames,
        }
        const serverToolDefs = serverTools
          .map((t) => buildDefinition(t, defCtx))
          .filter((d): d is ClientToolDefinition => d !== null)

        // Combine server tools with resolved client tools
        const allTools = [...serverToolDefs, ...eagerTools, ...activatedTools]
        this.lastTools = allTools

        // Compute lazy tool summaries each turn, filtering out activated tools
        const lazyToolSummaries = unloadedLazyTools

        // Build system prompt each turn so it reflects current plan state
        const systemPrompt = buildSystemPrompt(
          this.pageContext!,
          resolvedSkills,
          lazyToolSummaries,
          this.getActivePlanContext(),
          this.loadedSkills,
        )

        // Create stream using the provider
        const stream = this.provider.createStream(
          {
            apiKey,
            model: getDefaultModel(models)?.name ?? '',
          },
          {
            systemPrompt,
            // Pure projection of the immutable history — recomputed each round
            // from pristine canonical (applies the age + token-budget ceilings
            // and eager volatile-staleness without ever mutating the source).
            messages: this.history.projectForLlm(this.volatileLookup()),
            tools: allTools,
            maxTokens: 4096,
            signal: this.abortController.signal,
          },
        )

        // Process stream events — wrapped in try/catch for transient retry
        try {
          for await (const event of stream) {
            // Check for abort during streaming
            if (this.abortController?.signal.aborted) {
              break
            }

            switch (event.type) {
              case 'debug_request':
                this.lastDebugPayload = event.payload
                break

              case 'text_start':
                accumulator.startText()
                break

              case 'text_delta': {
                const transformed = accumulator.pushTextDelta(event.text)
                if (transformed !== null) {
                  send(peer, { type: 'text_delta', content: transformed })
                }
                break
              }

              case 'text_end':
                accumulator.endText()
                break

              case 'tool_use_start':
                accumulator.startToolUse(event.id, event.name)
                break

              case 'tool_use_delta':
                accumulator.pushToolUseDelta(event.partial_json)
                break

              case 'tool_use_end': {
                const finished = accumulator.finishToolUse()
                if (finished) {
                  if (!finished.ok) {
                    // Malformed JSON from the model — the tool_use block was
                    // recorded so the message structure stays valid; return an
                    // error result so the LLM can retry.
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: finished.id,
                      content: JSON.stringify({
                        error:
                          'Your tool call produced malformed JSON input. Please try again.',
                      }),
                      is_error: true,
                    })
                    break
                  }
                  const { id: toolUseId, name: toolName, input } = finished
                  const inputJson = finished.inputJson
                  const callId = `tc_${toolCallCounter++}`

                  // Detect repeated identical tool calls (same name + input).
                  const toolCallKey = toolName + ':' + inputJson
                  if (toolCallKey === lastToolCallKey) {
                    consecutiveIdenticalCalls++
                  } else {
                    lastToolCallKey = toolCallKey
                    consecutiveIdenticalCalls = 1
                  }

                  if (consecutiveIdenticalCalls > MAX_IDENTICAL_CALLS) {
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: toolUseId,
                      content: JSON.stringify({
                        error: `You have called "${toolName}" ${consecutiveIdenticalCalls} times in a row with identical parameters and received the same result each time. Stop repeating this call. Use the information you already have or try a different approach.`,
                      }),
                      is_error: true,
                    })
                    break
                  }

                  // Server-side tool: dispatch in-process.
                  const matchedServerTool = serverTools.find(
                    (t) => t.name === toolName,
                  )
                  if (matchedServerTool) {
                    const dispatch = await this.dispatchServerTool(
                      matchedServerTool,
                      {
                        toolUseId,
                        input,
                        defCtx,
                        resolvedSkills,
                        peer,
                        assistantContent,
                      },
                    )
                    toolResults.push(...dispatch.toolResults)
                    if (dispatch.extraBlocks) {
                      extraBlocks.push(...dispatch.extraBlocks)
                    }
                    if (dispatch.messagesCommitted) {
                      messagesCommittedByPlanTool = true
                    }
                    break
                  }

                  // Client-side tool: refuse calls not allowed in the current
                  // edit mode. Per-turn listing keeps out-of-mode tools away
                  // from the LLM, but a stale tool_use replayed from history
                  // (or a hallucinated name) can still arrive. Unconditional —
                  // no hidden-failure escape hatch. This gates LLM behavior
                  // only, NOT authorization: the backend enforces permissions
                  // on every mutation regardless of what the agent believes.
                  if (!this.toolAllowedInMode(toolName)) {
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: toolUseId,
                      content: JSON.stringify({
                        error: `The tool "${toolName}" is not available in the current edit mode ("${this.pageContext?.editMode}"). The Edit Mode section of the system prompt describes what is currently allowed.`,
                      }),
                      is_error: true,
                    })
                    break
                  }

                  // Validate the arguments server-side first.
                  // A malformed call is rejected silently — the error goes to
                  // the LLM (and the transcript) for a retry, but no `tool_call`
                  // is sent to the peer, so the UI shows nothing. If the model
                  // keeps failing, fall through after a couple tries so the
                  // error surfaces instead of spinning invisibly.
                  const validation = this.validateClientToolInput(
                    toolName,
                    input,
                  )
                  if (
                    !validation.ok &&
                    consecutiveValidationFailures <
                      MAX_HIDDEN_VALIDATION_FAILURES
                  ) {
                    consecutiveValidationFailures++
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: toolUseId,
                      content: JSON.stringify({ error: validation.error }),
                      is_error: true,
                    })
                    break
                  }
                  consecutiveValidationFailures = 0

                  toolResults.push(
                    ...(await this.dispatchClientTool({
                      toolUseId,
                      toolName,
                      callId,
                      input,
                      peer,
                    })),
                  )
                }
                break
              }

              case 'reasoning_summary':
                // Store reasoning in assistant content so it's fed back on
                // subsequent turns. The encryptedContent is the opaque blob
                // that OpenAI requires for stateless multi-turn reasoning
                // (when store: false).
                assistantContent.push({
                  type: 'reasoning',
                  id: event.id,
                  text: event.text,
                  encryptedContent: event.encryptedContent,
                })
                break

              case 'message_end': {
                const usage = createUsageTurn(event, getDefaultModel(models))
                if (usage) {
                  send(peer, { type: 'usage', usage })
                }
                break
              }

              case 'error':
                throw event.error
            }
          }
        } catch (streamError) {
          // Retry transient streaming errors (e.g. JSON parse errors
          // mid-stream) when no tools have been executed this turn.
          // API errors have an HTTP `status` property and should NOT
          // be retried.
          const isApiError =
            typeof (streamError as { status?: unknown }).status === 'number'
          const isRetryable = !isApiError && toolResults.length === 0

          if (isRetryable && streamRetryCount < MAX_STREAM_RETRIES) {
            streamRetryCount++
            console.warn(
              `[blokkli agent] Transient stream error, retrying (attempt ${streamRetryCount}/${MAX_STREAM_RETRIES}):`,
              streamError,
            )
            continue
          }

          // For transient errors that exhausted retries: roll back the
          // user message (if no turns committed anything to messages)
          // so the user can simply re-send their prompt.
          if (isRetryable && this.history.peekLast() === userMessage) {
            this.history.popLast()
            console.error(
              '[blokkli agent] Transient stream error, retries exhausted:',
              streamError,
            )
            const classified = classifyError(streamError)
            send(peer, { type: 'error', ...classified, retryable: true })
            break
          }

          throw streamError
        }

        // Check for abort after stream completes
        if (this.abortController?.signal.aborted) {
          break
        }

        // If create_plan handled messages directly, skip normal commit
        // and continue to the next agent loop iteration.
        if (messagesCommittedByPlanTool) {
          // A new plan was just created/approved — reset work tracking
          this.planStepHasWork = false
          continue
        }

        // Commit the assistant turn (a copy — the accumulator buffer for this
        // round is reused by `commitMessagesEarly`).
        let assistantNames: Map<string, string> | undefined
        if (assistantContent.length) {
          const assistant = new AssistantMessage([...assistantContent])
          assistantNames = assistant.toolUseNames()
          this.history.append(assistant)
        }

        // Commit the tool-result relay, resolving each result's tool name from
        // the assistant's tool_use blocks (drives volatile-staleness checks).
        if (toolResults.length) {
          const relay = ToolRelayMessage.fromWire({
            role: 'user',
            content: [...toolResults, ...extraBlocks],
          }).withResolvedNames((id) => assistantNames?.get(id))
          this.history.append(relay)
          // Reset retry counters — the LLM is making progress
          planRetryCount = 0
          streamRetryCount = 0
        }

        // If no tool calls were made, check if there's an active plan.
        // If so, retry the loop — the system prompt (rebuilt each iteration)
        // includes the active plan step instructions. Limit retries to
        // prevent infinite loops.
        if (toolResults.length === 0) {
          const hasActivePlan =
            this.plan && this.plan.steps.some((s) => s.status === 'in_progress')
          if (hasActivePlan && planRetryCount < 2) {
            planRetryCount++
            // Push a minimal user message to maintain valid message
            // alternation. The system prompt (rebuilt each iteration)
            // carries the authoritative plan continuation instruction.
            this.safePushUserMessage('[Continue with the plan.]')
            continue
          }

          const finalMessage = assistantContent
            .filter(
              (c): c is { type: 'text'; text: string } => c.type === 'text',
            )
            .map((t) => t.text)
            .join('\n')
            .trim()
          send(peer, { type: 'done', message: finalMessage || undefined })
          break
        }
      }
    } catch (error) {
      // Don't send errors if the session was aborted (cleanup/cancel).
      if (
        (error as Error).name !== 'AbortError' &&
        !this.abortController?.signal.aborted
      ) {
        console.error('Agent loop error:', error)
        const classified = classifyError(error)
        send(peer, { type: 'error', ...classified })
      }
    } finally {
      this.isProcessing = false
      this.abortController = null

      // No pruning here: the canonical history is never compressed. The LLM
      // view and the persistence snapshot are derived by pure projection.
      // Send conversation state for client-side persistence.
      this.sendConversationState(peer, authSecret)
    }
  }

  private waitForToolResult(
    callId: string,
  ): Promise<{ result: unknown; error?: string; skipLlmResponse?: boolean }> {
    return new Promise((resolve, reject) => {
      // No timeout - user may take time to approve/reject mutations.
      // Cleanup is handled by the WebSocket close handler if client disconnects.
      this.pendingToolCalls.set(callId, {
        resolve: (result) => {
          this.pendingToolCalls.delete(callId)
          resolve(result)
        },
        reject: (error) => {
          this.pendingToolCalls.delete(callId)
          reject(error)
        },
      })
    })
  }

  /**
   * Build the context object passed to a server-side tool handler. `assistantContent`
   * is the live block array for the current turn — `commitMessagesEarly` flushes and
   * resets it in place, so it must be the same reference the stream loop appends to.
   */
  private buildServerToolContext(args: {
    toolUseId: string
    peer: Peer
    resolvedSkills: ResolvedSkill[]
    assistantContent: GenericContentBlock[]
  }): ServerToolContext {
    const { toolUseId, peer, resolvedSkills, assistantContent } = args
    return {
      toolUseId,
      send: (msg) => send(peer, msg),
      resolvedSkills,
      lazyToolNames: this.lazyToolNames,
      activatedLazyTools: this.activatedLazyTools,
      loadedSkills: this.loadedSkills,
      plan: this.plan,
      setPlan: (p) => {
        this.plan = p
      },
      toClientPlan: () => this.toClientPlan(),
      waitForPlanApproval: () => this.waitForPlanApproval(),
      assistantContent,
      commitMessagesEarly: (toolResult) => {
        let names: Map<string, string> | undefined
        if (assistantContent.length) {
          const assistant = new AssistantMessage([...assistantContent])
          names = assistant.toolUseNames()
          this.history.append(assistant)
          assistantContent.length = 0
        }
        this.history.append(
          ToolRelayMessage.fromWire({
            role: 'user',
            content: [toolResult],
          }).withResolvedNames((id) => names?.get(id)),
        )
      },
      updateLastToolResult: (id, content) => {
        // A server tool (create_plan) finalising the placeholder relay it
        // committed earlier — an immutable swap, not an in-place edit.
        this.history.replaceLastResult(id, ToolResult.fromWire(content))
      },
      planStepHasWork: this.planStepHasWork,
      markPlanStepWork: () => {
        this.planStepHasWork = true
      },
      resetPlanStepWork: () => {
        this.planStepHasWork = false
      },
    }
  }

  /**
   * Dispatch a server-side tool: reject if unavailable, coerce + validate input,
   * run the handler. Returns the blocks to merge into the turn's results.
   */
  private async dispatchServerTool(
    tool: ServerSideTool,
    args: {
      toolUseId: string
      input: Record<string, unknown>
      defCtx: ToolDefinitionContext
      resolvedSkills: ResolvedSkill[]
      peer: Peer
      assistantContent: GenericContentBlock[]
    },
  ): Promise<{
    toolResults: ToolResultEntry[]
    extraBlocks?: (GenericTextBlock | GenericSkillBlock)[]
    messagesCommitted?: boolean
  }> {
    const { toolUseId, input, defCtx, resolvedSkills, peer, assistantContent } =
      args

    // Reject if the tool is not available in this context (e.g. the LLM
    // hallucinated a tool that was not offered).
    if (tool.isAvailable && !tool.isAvailable(defCtx)) {
      return {
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: JSON.stringify({
              error: 'This tool is not available right now.',
            }),
            is_error: true,
          },
        ],
      }
    }

    const handlerCtx = this.buildServerToolContext({
      toolUseId,
      peer,
      resolvedSkills,
      assistantContent,
    })

    try {
      // Coerce stringified arrays/objects before validation. LLMs sometimes
      // double-serialize parameters.
      const parsed = tool
        .inputSchema(defCtx)
        .parse(coerceStringifiedParams(input))
      const result = await tool.handle(handlerCtx, parsed)
      return {
        toolResults: result.toolResults,
        extraBlocks: result.extraBlocks,
        messagesCommitted: result.messagesCommitted,
      }
    } catch (e) {
      return {
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: JSON.stringify({
              error: `Invalid input: ${(e as Error).message}`,
            }),
            is_error: true,
          },
        ],
      }
    }
  }

  /**
   * Dispatch a client-side tool: send the call to the peer and await its result.
   * An `agentMessage` on the result replaces the `label` in the payload fed back
   * to the LLM (the label is UI-only). Returns the tool_result block(s).
   */
  /**
   * Validate an LLM-generated client tool call against its Zod `paramsSchema`
   * (the same schema the client parses with), server-side, before dispatching
   * to the peer. Returns an error string on a schema failure so the caller can
   * reject it silently. Unknown tools pass through (handled by normal dispatch).
   */
  private validateClientToolInput(
    toolName: string,
    input: Record<string, unknown>,
  ): { ok: true } | { ok: false; error: string } {
    const bundled = this.bundledToolMap.get(toolName)
    if (!bundled) return { ok: true }
    const parsed = bundled.paramsSchema.safeParse(
      coerceStringifiedParams(input),
    )
    if (parsed.success) return { ok: true }
    return {
      ok: false,
      error: `Invalid input: ${z.prettifyError(parsed.error)}`,
    }
  }

  private async dispatchClientTool(args: {
    toolUseId: string
    toolName: string
    callId: string
    input: Record<string, unknown>
    peer: Peer
  }): Promise<ToolResultEntry[]> {
    const { toolUseId, toolName, callId, input, peer } = args

    send(peer, {
      type: 'tool_call',
      callId,
      tool: toolName,
      params: input,
    })

    try {
      const clientResult = await this.waitForToolResult(callId)

      if (clientResult.error) {
        return [
          {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: JSON.stringify({ error: clientResult.error }),
            is_error: true,
          },
        ]
      }

      let resultForLLM = clientResult.result
      if (
        typeof resultForLLM === 'object' &&
        resultForLLM !== null &&
        'agentMessage' in resultForLLM
      ) {
        const { agentMessage, ...rest } = resultForLLM as Record<
          string,
          unknown
        >
        resultForLLM = { ...rest, label: agentMessage }
      }

      // Client-side tool completed successfully — counts as real work.
      this.planStepHasWork = true

      return [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: JSON.stringify(resultForLLM),
        },
      ]
    } catch (error) {
      return [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: JSON.stringify({ error: (error as Error).message }),
          is_error: true,
        },
      ]
    }
  }

  /**
   * Append a synthetic assistant `tool_use` + user `tool_result` message pair —
   * the shape used to inject pre-seeded results and to record auto-executed tool
   * calls before the LLM loop starts.
   */
  private pushToolExchange(
    toolUseId: string,
    toolName: string,
    input: Record<string, unknown>,
    result: ToolResult,
  ): void {
    this.history.appendToolExchange(
      new AssistantMessage([
        { type: 'tool_use', id: toolUseId, name: toolName, input },
      ]),
      new ToolRelayMessage([{ toolUseId, toolName, result }]),
    )
  }

  /**
   * Safely push a user message, merging with the last message if it's also a
   * user message — the LLM API rejects consecutive same-role messages.
   */
  private safePushUserMessage(text: string): void {
    this.history.mergeOrAppendUserText(text)
  }

  /**
   * Whether a tool's results go stale after a mutation — used by the live
   * projection's eager volatile eviction. Volatility is a property of the tool
   * definition, so it holds regardless of the current tool set.
   */
  private volatileLookup(): VolatileLookup {
    return (name) => !!(name && this.bundledToolMap.get(name)?.volatile)
  }

  private buildTranscript(): Transcript {
    // Build system prompt entries
    const system = this.pageContext
      ? buildSystemPromptEntries(
          this.pageContext,
          resolveSkills(this.pageContext),
          // Same mode filter as the live prompt build, so the transcript
          // preview shows what the LLM would actually be offered.
          this.lazyToolNames
            .filter((name) => this.toolAllowedInMode(name))
            .map((name) => this.getToolSummary(name))
            .filter(
              (s): s is { name: string; description: string } =>
                s !== undefined,
            ),
          this.getActivePlanContext(),
          this.loadedSkills,
        )
      : []

    // `seen` is the projected (compressed) view; `full` the canonical message,
    // included only where they differ.
    const messages = this.history.buildTranscriptMessages(this.volatileLookup())

    // Map last tools to transcript format
    const tools = this.lastTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }))

    return {
      system,
      messages,
      tools,
      ...(this.lastDebugPayload ? { lastRequest: this.lastDebugPayload } : {}),
    }
  }
}
