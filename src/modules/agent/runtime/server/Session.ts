import type { Peer } from 'crossws'
import type {
  PageContext,
  ClientToolDefinition,
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
  transformText,
  classifyError,
  pruneMessages,
  pruneForPersistence,
  computeStateHash,
  verifyStateHash,
  validateMessages,
} from './helpers'
import type {
  ServerPlan,
  ServerSideTool,
  ServerToolContext,
  ToolDefinitionContext,
} from './server-tools'
import { buildDefinition } from './server-tools'
import loadSkillTool from './server-tools/load_skill'
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
      resolve: (result: { result: unknown; error?: string }) => void
      reject: (error: Error) => void
    }
  >()

  abortController: AbortController | null = null
  isProcessing = false

  /** Eager tools sent to the LLM on every turn */
  tools: ClientToolDefinition[] = []
  /** Lazy tools held back until activated via load_tools */
  lazyTools: ClientToolDefinition[] = []
  /** Names of lazy tools that have been activated via load_tools */
  activatedLazyTools = new Set<string>()
  /** Names of skills that have been loaded via load_skill */
  loadedSkills = new Set<string>()
  /** Page context received from client on init */
  pageContext?: PageContext

  /** Current plan (null when no plan is active) */
  plan: ServerPlan | null = null
  /** Pending plan approval promise resolver */
  pendingPlanApproval: { resolve: (approved: boolean) => void } | null = null
  /** Pre-pruned messages snapshot for transcript (captured before pruneMessages) */
  private unprunedMessages: GenericMessage[] = []
  /** Last generic tool definitions for transcript */
  private lastTools: ClientToolDefinition[] = []

  // --------------------------------------------------------------------------
  // Public methods
  // --------------------------------------------------------------------------

  init(tools: ClientToolDefinition[], pageContext: PageContext): void {
    this.tools = tools.filter((t) => !t.lazy)
    this.lazyTools = tools.filter((t) => !!t.lazy)
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
  ): void {
    if (this.isProcessing) {
      send(peer, {
        type: 'error',
        errorType: 'bad_request',
        message: 'Agent is already processing a request',
      })
      return
    }
    this.runAgentLoop(peer, prompt, apiKey, authSecret, selectedUuids)
  }

  resolveToolResult(
    callId: string,
    result: { result: unknown; error?: string },
  ): void {
    const pending = this.pendingToolCalls.get(callId)
    if (pending) {
      pending.resolve(result)
    }
  }

  cancel(peer: Peer): void {
    this.abortController?.abort()
    // Bug 1 fix: reject all pending tool call promises so the agent loop
    // doesn't hang waiting for a client response that will never come.
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
    this.tools = []
    this.lazyTools = []
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
    const validLazyToolNames = new Set(this.lazyTools.map((t) => t.name))
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
  ): Promise<void> {
    if (this.tools.length === 0) {
      send(peer, {
        type: 'error',
        errorType: 'bad_request',
        message:
          'No tools available. Client must send init message with tools first.',
      })
      return
    }

    if (!this.pageContext) {
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

    const lazyToolSummaries = this.lazyTools.map((t) => ({
      name: t.name,
      description: t.description,
    }))

    // Build initial user message with context
    const userParts: string[] = []

    if (selectedUuids?.length) {
      userParts.push(
        `[User has selected the following paragraphs: ${selectedUuids.join(', ')}]`,
      )
    }

    userParts.push(prompt)

    const userMessage: GenericMessage = {
      role: 'user',
      content: userParts.join('\n\n'),
    }
    this.messages.push(userMessage)

    this.abortController = new AbortController()
    this.isProcessing = true
    let toolCallCounter = 0
    let planRetryCount = 0
    let streamRetryCount = 0
    const MAX_STREAM_RETRIES = 1

    try {
      while (true) {
        // Check for abort
        if (this.abortController.signal.aborted) {
          break
        }

        // Send thinking indicator
        send(peer, { type: 'thinking' })

        // Track content blocks as they complete
        const assistantContent: GenericContentBlock[] = []
        const toolResults: Array<{
          type: 'tool_result'
          tool_use_id: string
          content: string
          is_error?: boolean
        }> = []
        const extraBlocks: (GenericTextBlock | GenericSkillBlock)[] = []

        // Flag set by create_plan: messages already committed, skip normal commit
        let messagesCommittedByPlanTool = false

        // Track current tool use being streamed
        let currentToolUse: {
          id: string
          name: string
          inputJson: string
        } | null = null

        // Track current text block
        let currentTextContent = ''
        let inTextBlock = false

        // Lazy tools that have been activated via load_tools
        const activatedTools = this.lazyTools.filter((t) =>
          this.activatedLazyTools.has(t.name),
        )

        // Build server-side tool definitions for this turn
        const unloadedLazyTools = this.lazyTools.filter(
          (t) => !this.activatedLazyTools.has(t.name),
        )
        const defCtx: ToolDefinitionContext = {
          resolvedSkills,
          plan: this.plan,
          unloadedLazyTools,
        }
        const serverToolDefs = serverTools
          .map((t) => buildDefinition(t, defCtx))
          .filter((d): d is ClientToolDefinition => d !== null)

        // Combine server tools with client tools
        const allTools = [...serverToolDefs, ...this.tools, ...activatedTools]
        this.lastTools = allTools

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
            model: (models.find((m) => m.isDefault) || models[0]!).name,
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
                break

              case 'text_start':
                inTextBlock = true
                currentTextContent = ''
                break

              case 'text_delta':
                if (inTextBlock) {
                  const transformed = transformText(event.text)
                  currentTextContent += transformed
                  send(peer, { type: 'text_delta', content: transformed })
                }
                break

              case 'text_end':
                if (inTextBlock && currentTextContent) {
                  assistantContent.push({
                    type: 'text',
                    text: currentTextContent,
                  })
                }
                currentTextContent = ''
                inTextBlock = false
                break

              case 'tool_use_start':
                currentToolUse = {
                  id: event.id,
                  name: event.name,
                  inputJson: '',
                }
                break

              case 'tool_use_delta':
                if (currentToolUse) {
                  currentToolUse.inputJson += event.partial_json
                }
                break

              case 'tool_use_end':
                if (currentToolUse) {
                  let input: Record<string, unknown>
                  try {
                    input = JSON.parse(currentToolUse.inputJson || '{}')
                  } catch {
                    // Malformed JSON from the model — record an empty tool_use
                    // so the message structure stays valid, then return an error
                    // result so the LLM can retry.
                    input = {}
                    assistantContent.push({
                      type: 'tool_use',
                      id: currentToolUse.id,
                      name: currentToolUse.name,
                      input,
                    })
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: currentToolUse.id,
                      content: JSON.stringify({
                        error:
                          'Your tool call produced malformed JSON input. Please try again.',
                      }),
                      is_error: true,
                    })
                    currentToolUse = null
                    break
                  }
                  const callId = `tc_${toolCallCounter++}`

                  // Add to assistant content
                  assistantContent.push({
                    type: 'tool_use',
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input,
                  })

                  // Check if this is a server-side tool
                  const matchedServerTool = serverTools.find(
                    (t) => t.name === currentToolUse!.name,
                  )
                  if (matchedServerTool) {
                    // Reject if the tool is not available in this context
                    // (e.g. LLM hallucinated a tool that was not offered).
                    if (
                      matchedServerTool.isAvailable &&
                      !matchedServerTool.isAvailable(defCtx)
                    ) {
                      toolResults.push({
                        type: 'tool_result',
                        tool_use_id: currentToolUse.id,
                        content: JSON.stringify({
                          error: 'This tool is not available right now.',
                        }),
                        is_error: true,
                      })
                      currentToolUse = null
                      break
                    }
                    const handlerCtx: ServerToolContext = {
                      toolUseId: currentToolUse.id,
                      send: (msg) => send(peer, msg),
                      resolvedSkills,
                      lazyTools: this.lazyTools,
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
                      updateLastToolResult: (toolUseId, content) => {
                        const lastMsg = this.messages[this.messages.length - 1]
                        if (
                          lastMsg.role === 'user' &&
                          Array.isArray(lastMsg.content)
                        ) {
                          const resultBlock = lastMsg.content.find(
                            (b) =>
                              b.type === 'tool_result' &&
                              b.tool_use_id === toolUseId,
                          )
                          if (
                            resultBlock &&
                            resultBlock.type === 'tool_result'
                          ) {
                            resultBlock.content = content
                          }
                        }
                      },
                    }
                    try {
                      const parsed = matchedServerTool
                        .inputSchema(defCtx)
                        .parse(input)
                      const result = await matchedServerTool.handle(
                        handlerCtx,
                        parsed,
                      )
                      toolResults.push(...result.toolResults)
                      if (result.extraBlocks) {
                        extraBlocks.push(...result.extraBlocks)
                      }
                      if (result.messagesCommitted) {
                        messagesCommittedByPlanTool = true
                      }
                    } catch (e) {
                      toolResults.push({
                        type: 'tool_result',
                        tool_use_id: currentToolUse.id,
                        content: JSON.stringify({
                          error: `Invalid input: ${(e as Error).message}`,
                        }),
                        is_error: true,
                      })
                    }
                    currentToolUse = null
                    break
                  }

                  // Send tool call to client
                  send(peer, {
                    type: 'tool_call',
                    callId,
                    tool: currentToolUse.name,
                    params: input as Record<string, unknown>,
                  })

                  // Wait for client to respond
                  try {
                    const clientResult = await this.waitForToolResult(callId)

                    if (clientResult.error) {
                      toolResults.push({
                        type: 'tool_result',
                        tool_use_id: currentToolUse.id,
                        content: JSON.stringify({
                          error: clientResult.error,
                        }),
                        is_error: true,
                      })
                    } else {
                      // If the result has an agentMessage, replace label
                      // with it in the payload sent to the LLM. The label
                      // is only shown in the UI.
                      let resultForLLM = clientResult.result
                      if (
                        typeof resultForLLM === 'object' &&
                        resultForLLM !== null &&
                        'agentMessage' in resultForLLM
                      ) {
                        const { agentMessage, ...rest } =
                          resultForLLM as Record<string, unknown>
                        resultForLLM = { ...rest, label: agentMessage }
                      }

                      toolResults.push({
                        type: 'tool_result',
                        tool_use_id: currentToolUse.id,
                        content: JSON.stringify(resultForLLM),
                      })
                    }
                  } catch (error) {
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: currentToolUse.id,
                      content: JSON.stringify({
                        error: (error as Error).message,
                      }),
                      is_error: true,
                    })
                  }

                  currentToolUse = null
                }
                break

              case 'message_end':
                if (
                  event.inputTokens !== undefined &&
                  event.outputTokens !== undefined
                ) {
                  const defaultModel =
                    models.find((m) => m.isDefault) || models[0]
                  send(peer, {
                    type: 'usage',
                    usage: {
                      inputTokens: event.inputTokens,
                      outputTokens: event.outputTokens,
                      cacheCreationInputTokens:
                        event.cacheCreationInputTokens ?? 0,
                      cacheReadInputTokens: event.cacheReadInputTokens ?? 0,
                      pricing: defaultModel?.pricing ?? null,
                    },
                  })
                }
                break

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

      // Bug 2 fix: prune in finally so messages are compressed even after errors.
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
  ): Promise<{ result: unknown; error?: string }> {
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
   * Bug 3 fix: safely push a user message, merging with the last message
   * if it's also a user message to avoid consecutive same-role messages.
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
    for (const tool of [...this.tools, ...this.lazyTools]) {
      if (tool.volatile) {
        map.set(tool.name, { volatile: true })
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
          this.lazyTools.map((t) => ({
            name: t.name,
            description: t.description,
          })),
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

    return { system, messages, tools }
  }
}
