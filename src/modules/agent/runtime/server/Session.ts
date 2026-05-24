import { z } from 'zod'
import type { Peer } from 'crossws'
import type {
  PageContext,
  ClientToolDefinition,
  ServerToolMetadata,
  ClientPlanState,
  ClientPlanStep,
  ConversationStateSnapshot,
  GenericMessage,
  GenericContentBlock,
  GenericTextBlock,
  GenericSkillBlock,
  Transcript,
  TranscriptMessage,
} from '../shared/types'
import { buildSystemPrompt, buildSystemPromptEntries } from './agentPrompt'
import type { ActivePlanContext } from './system-prompts/types'
import { provider, models } from '#blokkli-build/agent-server'
import type { ToolPruningMetadata } from './helpers'
import {
  send,
  KEEP_RECENT_TURNS,
  resolveSkills,
  classifyError,
  pruneMessages,
  pruneForPersistence,
  computeStateHash,
  verifyStateHash,
  validateMessages,
  isToolResultOnly,
  getDefaultModel,
  createUsageTurn,
} from './helpers'
import type {
  ServerPlan,
  ServerSideTool,
  ServerToolContext,
  ToolDefinitionContext,
  ToolResultEntry,
} from './server-tools'
import type { ResolvedSkill } from './skills/types'
import { buildDefinition, stripSchemaOverhead } from './server-tools'
import { StreamAccumulator } from './StreamAccumulator'

import loadSkillTool from './server-tools/load_skills'
import loadToolsTool from './server-tools/load_tools'
import createPlanTool from './server-tools/create_plan'
import completePlanStepTool from './server-tools/complete_plan_step'

const serverTools: ServerSideTool[] = [
  loadSkillTool,
  loadToolsTool,
  createPlanTool,
  completePlanStepTool,
]

// ============================================================================
// Session class
// ============================================================================

export class Session {
  messages: GenericMessage[] = []
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
  /** Page context received from client on init */
  pageContext?: PageContext

  /** Current plan (null when no plan is active) */
  plan: ServerPlan | null = null
  /** Whether any real work (non-server tool calls) happened since the last plan step started */
  planStepHasWork = false
  /** Pending plan approval promise resolver */
  pendingPlanApproval: { resolve: (approved: boolean) => void } | null = null
  /** Pre-pruned messages snapshot for transcript (captured before pruneMessages) */
  private unprunedMessages: GenericMessage[] = []
  /** Last generic tool definitions for transcript */
  private lastTools: ClientToolDefinition[] = []
  /** Last raw request payload for transcript (dev only) */
  private lastDebugPayload: unknown = null

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

  // --------------------------------------------------------------------------
  // Public methods
  // --------------------------------------------------------------------------

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
  }

  start(
    peer: Peer,
    prompt: string,
    apiKey: string,
    authSecret: string,
    selectedUuids?: string[],
    autoLoadTools?: string[],
    autoLoadSkills?: string[],
    preSeededResults?: {
      toolName: string
      params: Record<string, unknown>
      result: unknown
    }[],
    autoExecuteTools?: {
      toolName: string
      params: Record<string, unknown>
    }[],
    rollbackToUserMessageIndex?: number,
  ): void {
    if (this.isProcessing) {
      send(peer, {
        type: 'error',
        errorType: 'bad_request',
        message: 'Agent is already processing a request',
      })
      return
    }

    if (rollbackToUserMessageIndex !== undefined) {
      try {
        this.truncateAtUserMessage(rollbackToUserMessageIndex)
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

    this.runAgentLoop(
      peer,
      prompt,
      apiKey,
      authSecret,
      selectedUuids,
      autoLoadTools,
      autoLoadSkills,
      preSeededResults,
      autoExecuteTools,
    )
  }

  /**
   * Remove the Nth real user turn (0-based) and every message after it.
   * "Real user turn" excludes tool-result relays. Throws if the index is
   * out of range — typically because the target turn has been pruned away.
   */
  private truncateAtUserMessage(targetIndex: number): void {
    let userCount = 0
    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i]
      if (!msg) continue
      if (msg.role === 'user' && !isToolResultOnly(msg)) {
        if (userCount === targetIndex) {
          this.messages = this.messages.slice(0, i)
          // Caches tied to the truncated turns are no longer valid.
          this.unprunedMessages = []
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
          return
        }
        userCount++
      }
    }
    throw new Error(
      `rollbackToUserMessageIndex ${targetIndex} out of range (only ${userCount} real user turns)`,
    )
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
    this.messages = []
    this.unprunedMessages = []
    this.lastTools = []
    this.lastDebugPayload = null
    this.activatedLazyTools.clear()
    this.loadedSkills.clear()
    this.plan = null
    if (this.pendingPlanApproval) {
      this.pendingPlanApproval.resolve(false)
      this.pendingPlanApproval = null
    }
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
    this.messages = []
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
    const prunedMessages = pruneForPersistence(this.messages)
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

    this.messages = state.messages
    this.unprunedMessages = []
    this.lastTools = []

    // Only restore lazy tools that still exist in the current tool set
    const validLazyToolNames = new Set(this.lazyToolNames)
    this.activatedLazyTools = new Set(
      state.activatedLazyTools.filter((name) => validLazyToolNames.has(name)),
    )

    this.plan = null

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
    prompt: string,
    apiKey: string,
    authSecret: string,
    selectedUuids?: string[],
    autoLoadTools?: string[],
    autoLoadSkills?: string[],
    preSeededResults?: {
      toolName: string
      params: Record<string, unknown>
      result: unknown
    }[],
    autoExecuteTools?: {
      toolName: string
      params: Record<string, unknown>
    }[],
  ): Promise<void> {
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

    // Build initial user message with context
    const userParts: string[] = []

    if (selectedUuids?.length) {
      userParts.push(
        `[User has selected the following paragraphs: ${selectedUuids.join(', ')}]`,
      )
    }

    userParts.push(prompt)

    const userMessage: GenericMessage =
      autoLoadedSkillBlocks.length > 0
        ? {
            role: 'user',
            content: [
              ...autoLoadedSkillBlocks,
              { type: 'text', text: userParts.join('\n\n') },
            ],
          }
        : { role: 'user', content: userParts.join('\n\n') }
    this.messages.push(userMessage)

    // Inject pre-seeded tool results as synthetic assistant/user message pairs.
    // These appear in the conversation history so the LLM sees the analysis
    // without needing to call the tools itself.
    if (preSeededResults?.length) {
      for (let i = 0; i < preSeededResults.length; i++) {
        const preSeeded = preSeededResults[i]!
        const toolUseId = `preseed_${i}`
        this.pushToolExchange(toolUseId, preSeeded.toolName, preSeeded.params, {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: JSON.stringify(preSeeded.result),
        })
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

        send(peer, {
          type: 'tool_call',
          callId,
          tool: autoTool.toolName,
          params: autoTool.params,
        })

        try {
          const clientResult = await this.waitForToolResult(callId)

          let toolResult: ToolResultEntry
          if (clientResult.error) {
            hasErrors = true
            allSkip = false
            toolResult = {
              type: 'tool_result',
              tool_use_id: toolUseId,
              content: JSON.stringify({ error: clientResult.error }),
              is_error: true,
            }
          } else {
            if (!clientResult.skipLlmResponse) {
              allSkip = false
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
            toolResult = {
              type: 'tool_result',
              tool_use_id: toolUseId,
              content: JSON.stringify(resultForLLM),
            }
          }
          this.pushToolExchange(
            toolUseId,
            autoTool.toolName,
            autoTool.params,
            toolResult,
          )
        } catch {
          hasErrors = true
          allSkip = false
          // Client disconnected or cancelled — inject error result so the
          // LLM can see the failure and decide what to do.
          this.pushToolExchange(toolUseId, autoTool.toolName, autoTool.params, {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: JSON.stringify({
              error: 'Auto-executed tool call was cancelled.',
            }),
            is_error: true,
          })
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

        // Resolve eager tools from names
        const eagerTools = this.resolveToolDefinitions(this.toolNames)

        // Resolve activated lazy tools
        const activatedToolNames = this.lazyToolNames.filter((name) =>
          this.activatedLazyTools.has(name),
        )
        const activatedTools = this.resolveToolDefinitions(activatedToolNames)

        // Build server-side tool definitions for this turn
        const unloadedLazyToolNames = this.lazyToolNames.filter(
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
          lazyToolNames: this.lazyToolNames,
        }
        const serverToolDefs = serverTools
          .map((t) => buildDefinition(t, defCtx))
          .filter((d): d is ClientToolDefinition => d !== null)

        // Combine server tools with resolved client tools
        const allTools = [...serverToolDefs, ...eagerTools, ...activatedTools]
        this.lastTools = allTools

        // Compute lazy tool summaries each turn, filtering out activated tools
        const lazyToolSummaries = this.lazyToolNames
          .filter((name) => !this.activatedLazyTools.has(name))
          .map((name) => this.getToolSummary(name))
          .filter(
            (s): s is { name: string; description: string } => s !== undefined,
          )

        // Build system prompt each turn so it reflects current plan state
        const systemPrompt = buildSystemPrompt(
          this.pageContext!,
          resolvedSkills,
          lazyToolSummaries,
          this.getActivePlanContext(),
          this.loadedSkills,
        )

        // Create stream using the provider
        const stream = provider.createStream(
          {
            apiKey,
            model: getDefaultModel(models)?.name ?? '',
          },
          {
            systemPrompt,
            messages: this.messages,
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
                      { toolUseId, input, defCtx, resolvedSkills, peer, assistantContent },
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

                  // Client-side tool: round-trip to the peer.
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
          if (
            isRetryable &&
            this.messages[this.messages.length - 1] === userMessage
          ) {
            this.messages.pop()
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

        // Add assistant response to history if we have content
        if (assistantContent.length) {
          this.messages.push({
            role: 'assistant',
            content: assistantContent,
          })
        }

        // Add tool results to history if we have any
        if (toolResults.length) {
          this.messages.push({
            role: 'user',
            content: [...toolResults, ...extraBlocks],
          })
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

      // Snapshot messages before pruning so the transcript can show both versions.
      this.unprunedMessages = structuredClone(this.messages)

      // Prune in `finally` so messages are compressed even after errors.
      pruneMessages(
        this.messages,
        KEEP_RECENT_TURNS,
        this.buildToolMetadataMap(),
      )

      // Reconcile loadedSkills: if pruning removed a skill's text block,
      // remove it from the set so the system prompt no longer says it's loaded.
      if (this.loadedSkills.size > 0) {
        this.reconcileLoadedSkills()
      }

      // Send conversation state for client-side persistence
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
        if (assistantContent.length) {
          this.messages.push({
            role: 'assistant',
            content: [...assistantContent],
          })
          assistantContent.length = 0
        }
        this.messages.push({
          role: 'user',
          content: [toolResult],
        })
      },
      updateLastToolResult: (id, content) => {
        const lastMsg = this.messages[this.messages.length - 1]
        if (lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
          const resultBlock = lastMsg.content.find(
            (b) => b.type === 'tool_result' && b.tool_use_id === id,
          )
          if (resultBlock && resultBlock.type === 'tool_result') {
            resultBlock.content = content
          }
        }
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
      const coercedInput: Record<string, unknown> = {}
      for (const key of Object.keys(input)) {
        const value = input[key]
        if (
          typeof value === 'string' &&
          (value[0] === '[' || value[0] === '{')
        ) {
          try {
            coercedInput[key] = JSON.parse(value)
          } catch {
            coercedInput[key] = value
          }
        } else {
          coercedInput[key] = value
        }
      }
      const parsed = tool.inputSchema(defCtx).parse(coercedInput)
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
        const { agentMessage, ...rest } = resultForLLM as Record<string, unknown>
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
    toolResult: ToolResultEntry,
  ): void {
    this.messages.push({
      role: 'assistant',
      content: [{ type: 'tool_use', id: toolUseId, name: toolName, input }],
    })
    this.messages.push({ role: 'user', content: [toolResult] })
  }

  /**
   * Safely push a user message, merging with the last message if it's also a
   * user message — the LLM API rejects consecutive same-role messages.
   */
  private safePushUserMessage(text: string): void {
    const lastMessage = this.messages[this.messages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      // Merge into existing user message
      if (typeof lastMessage.content === 'string') {
        lastMessage.content = lastMessage.content + '\n' + text
      } else {
        // Array content — append as text block
        lastMessage.content.push({ type: 'text', text })
      }
    } else {
      this.messages.push({ role: 'user', content: text })
    }
  }

  /**
   * Remove skills from loadedSkills whose text content has been pruned
   * from the conversation messages.
   */
  private reconcileLoadedSkills(): void {
    // Collect skill names still present as skill blocks in messages
    const presentSkills = new Set<string>()
    for (const msg of this.messages) {
      if (msg.role !== 'user' || !Array.isArray(msg.content)) continue
      for (const block of msg.content) {
        if (block.type === 'skill') {
          presentSkills.add(block.name)
        }
      }
    }
    // Remove any skills that are no longer in the messages
    for (const name of this.loadedSkills) {
      if (!presentSkills.has(name)) {
        this.loadedSkills.delete(name)
      }
    }
  }

  /**
   * Build a map of tool name to pruning metadata from all known tools.
   */
  private buildToolMetadataMap(): Map<string, ToolPruningMetadata> {
    const map = new Map<string, ToolPruningMetadata>()
    for (const name of [...this.toolNames, ...this.lazyToolNames]) {
      const bundled = this.bundledToolMap.get(name)
      if (bundled?.volatile) {
        map.set(name, { volatile: true })
      }
    }
    return map
  }

  private buildTranscript(): Transcript {
    // Build system prompt entries
    const system = this.pageContext
      ? buildSystemPromptEntries(
          this.pageContext,
          resolveSkills(this.pageContext),
          this.lazyToolNames
            .map((name) => this.getToolSummary(name))
            .filter(
              (s): s is { name: string; description: string } =>
                s !== undefined,
            ),
          this.getActivePlanContext(),
          this.loadedSkills,
        )
      : []

    // Zip pruned (seen) messages with unpruned (full) messages
    const messages: TranscriptMessage[] = this.messages.map((msg, i) => {
      const entry: TranscriptMessage = {
        type: msg.role === 'assistant' ? 'agent' : 'user',
        seen: msg.content,
      }

      const unpruned = this.unprunedMessages[i]
      if (unpruned) {
        const seenJson = JSON.stringify(msg.content)
        const fullJson = JSON.stringify(unpruned.content)
        if (seenJson !== fullJson) {
          entry.full = unpruned.content
        }
      }

      return entry
    })

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
