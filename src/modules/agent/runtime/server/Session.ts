import type { Peer } from 'crossws'
import { useRuntimeConfig } from '#imports'
import type {
  PageContext,
  ClientToolDefinition,
  ConversationStateSnapshot,
  GenericMessage,
  GenericContentBlock,
} from '../shared/types'
import { buildSystemPrompt } from './agentPrompt'
import { provider, aiModel } from '#blokkli-build/agent-server'
import type { ToolPruningMetadata } from './helpers'
import {
  send,
  DEBUG_LOGGING,
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
  /** Page context received from client on init */
  pageContext?: PageContext

  // --------------------------------------------------------------------------
  // Public methods
  // --------------------------------------------------------------------------

  init(tools: ClientToolDefinition[], pageContext: PageContext): void {
    this.tools = tools.filter((t) => !t.lazy)
    this.lazyTools = tools.filter((t) => !!t.lazy)
    this.activatedLazyTools = new Set()
    this.pageContext = pageContext

    if (DEBUG_LOGGING) {
      console.log(
        `[WebSocket] Received ${this.tools.length} eager tools, ${this.lazyTools.length} lazy tools from client`,
      )
      console.log(
        `[WebSocket] Received page context with ${this.pageContext?.bundles.length ?? 0} block bundles from client`,
      )
    }
  }

  start(peer: Peer, prompt: string, selectedUuids?: string[]): void {
    if (this.isProcessing) {
      send(peer, {
        type: 'error',
        errorType: 'bad_request',
        message: 'Agent is already processing a request',
      })
      return
    }
    this.runAgentLoop(peer, prompt, selectedUuids)
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
    send(peer, { type: 'done' })
  }

  acceptChanges(peer: Peer): void {
    this.safePushUserMessage(`[System: Changes accepted and applied.]`)
    send(peer, { type: 'done', message: 'Changes accepted' })
    this.sendConversationState(peer)
  }

  rejectChanges(peer: Peer): void {
    this.safePushUserMessage(
      `[System: Changes rejected. All pending changes have been reverted. The page is back to its previous state.]`,
    )
    send(peer, { type: 'done', message: 'Changes rejected' })
    this.sendConversationState(peer)
  }

  getTranscript(peer: Peer): void {
    send(peer, {
      type: 'transcript',
      content: this.buildTranscript(),
    })
  }

  newConversation(peer: Peer): void {
    this.abortController?.abort()
    this.messages = []
    this.activatedLazyTools.clear()
    send(peer, { type: 'done' })
    // Send empty state so adapter clears persisted data
    this.sendConversationState(peer)
  }

  cleanup(): void {
    this.abortController?.abort()
    for (const pending of this.pendingToolCalls.values()) {
      pending.reject(new Error('Session closed'))
    }
    this.pendingToolCalls.clear()
    this.messages = []
    this.tools = []
    this.lazyTools = []
    this.activatedLazyTools.clear()
    this.pageContext = undefined
  }

  /**
   * Build a persistence snapshot and send it to the client.
   */
  sendConversationState(peer: Peer): void {
    const state = this.getConversationStateForPersistence()
    send(peer, { type: 'conversation_state', state })
  }

  /**
   * Create an aggressively pruned snapshot of the current conversation
   * for client-side persistence.
   */
  getConversationStateForPersistence(): ConversationStateSnapshot {
    const config = useRuntimeConfig()
    const authSecret = config.blokkli?.agent?.authSecret || ''
    const prunedMessages = pruneForPersistence(this.messages)
    const activatedLazyTools = Array.from(this.activatedLazyTools)
    const hash = computeStateHash(
      prunedMessages,
      activatedLazyTools,
      authSecret,
    )
    return { messages: prunedMessages, activatedLazyTools, hash }
  }

  /**
   * Restore conversation state from a client-provided snapshot.
   * Verifies HMAC integrity before loading.
   */
  restoreConversation(state: ConversationStateSnapshot): {
    success: boolean
    reason?: string
  } {
    const config = useRuntimeConfig()
    const authSecret = config.blokkli?.agent?.authSecret || ''

    if (!verifyStateHash(state, authSecret)) {
      return { success: false, reason: 'Invalid state hash' }
    }

    const issues = validateMessages(state.messages)
    if (issues.length > 0) {
      if (DEBUG_LOGGING) {
        console.warn('[Restore] Message validation issues:', issues)
      }
      return { success: false, reason: 'Invalid message structure' }
    }

    this.messages = state.messages

    // Only restore lazy tools that still exist in the current tool set
    const validLazyToolNames = new Set(this.lazyTools.map((t) => t.name))
    this.activatedLazyTools = new Set(
      state.activatedLazyTools.filter((name) => validLazyToolNames.has(name)),
    )

    if (DEBUG_LOGGING) {
      console.log(
        `[Restore] Restored ${this.messages.length} messages, ${this.activatedLazyTools.size} activated lazy tools`,
      )
    }

    return { success: true }
  }

  // --------------------------------------------------------------------------
  // Private methods
  // --------------------------------------------------------------------------

  private async runAgentLoop(
    peer: Peer,
    prompt: string,
    selectedUuids?: string[],
  ): Promise<void> {
    const config = useRuntimeConfig()

    // Get API key based on provider
    const providerName = provider.name
    const apiKey = config.blokkli?.agent?.apiKey

    if (!apiKey) {
      send(peer, {
        type: 'error',
        errorType: 'authentication',
        message: `${providerName} API key not configured`,
      })
      return
    }

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

    const systemPrompt = buildSystemPrompt(
      this.pageContext,
      resolvedSkills,
      lazyToolSummaries,
    )

    // Build initial user message with context about selection
    let userContent = prompt
    if (selectedUuids?.length) {
      userContent = `[User has selected the following blocks: ${selectedUuids.join(', ')}]\n\n${prompt}`
    }

    this.messages.push({
      role: 'user',
      content: userContent,
    })

    this.abortController = new AbortController()
    this.isProcessing = true
    let toolCallCounter = 0

    try {
      while (true) {
        // Check for abort
        if (this.abortController.signal.aborted) {
          break
        }

        // Send thinking indicator
        send(peer, { type: 'thinking' })

        // Bug 5: validate messages before API call in debug mode
        if (DEBUG_LOGGING) {
          console.log('\n========== AGENT LOOP ITERATION ==========')
          const issues = validateMessages(this.messages)
          if (issues.length) {
            console.warn('[Validation] Message issues detected:', issues)
          }
          console.log('Messages:', JSON.stringify(this.messages, null, 2))
        }

        // Track content blocks as they complete
        const assistantContent: GenericContentBlock[] = []
        const toolResults: Array<{
          type: 'tool_result'
          tool_use_id: string
          content: string
          is_error?: boolean
        }> = []
        const extraTextBlocks: Array<{ type: 'text'; text: string }> = []

        // Track current tool use being streamed
        let currentToolUse: {
          id: string
          name: string
          inputJson: string
        } | null = null

        // Track current text block
        let currentTextContent = ''
        let inTextBlock = false

        // Build server-side tools (load_skill) if resolved skills are available
        const serverTools: ClientToolDefinition[] =
          resolvedSkills.length > 0
            ? [
                {
                  name: 'load_skill',
                  description:
                    'Load detailed guidelines for a specific skill. Call this before writing or editing content that should follow specific rules or guidelines.',
                  input_schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        enum: resolvedSkills.map((s) => s.name),
                        description: 'The skill to load',
                      },
                    },
                    required: ['name'],
                  },
                },
              ]
            : []

        // Lazy tools that have been activated via load_tools
        const activatedTools = this.lazyTools.filter((t) =>
          this.activatedLazyTools.has(t.name),
        )

        // Build load_tools server tool (only if there are unloaded lazy tools)
        const unloadedLazyTools = this.lazyTools.filter(
          (t) => !this.activatedLazyTools.has(t.name),
        )
        const loadToolsDef: ClientToolDefinition[] =
          unloadedLazyTools.length > 0
            ? [
                {
                  name: 'load_tools',
                  description:
                    'Load additional tools by name before using them. You must call this before using any tool listed under "Additional Tools" in the system prompt.',
                  input_schema: {
                    type: 'object',
                    properties: {
                      tools: {
                        type: 'array',
                        items: {
                          type: 'string',
                          enum: unloadedLazyTools.map((t) => t.name),
                        },
                        description: 'Tool names to activate',
                      },
                    },
                    required: ['tools'],
                  },
                },
              ]
            : []

        // Combine server tools with client tools
        const allTools = [
          ...serverTools,
          ...loadToolsDef,
          ...this.tools,
          ...activatedTools,
        ]

        // Create stream using the provider
        const stream = provider.createStream(
          { apiKey, model: aiModel },
          {
            systemPrompt,
            messages: this.messages,
            tools: allTools,
            maxTokens: 4096,
            signal: this.abortController.signal,
          },
        )

        // Process stream events
        for await (const event of stream) {
          // Check for abort during streaming
          if (this.abortController?.signal.aborted) {
            break
          }

          if (
            DEBUG_LOGGING &&
            event.type !== 'text_delta' &&
            event.type !== 'tool_use_delta'
          ) {
            console.log('Stream event:', event.type)
          }

          switch (event.type) {
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
                const input = JSON.parse(currentToolUse.inputJson || '{}')
                const callId = `tc_${toolCallCounter++}`

                if (DEBUG_LOGGING) {
                  console.log(
                    `\n--- TOOL CALL: ${currentToolUse.name} (${callId}) ---`,
                  )
                  console.log('Input:', JSON.stringify(input, null, 2))
                }

                // Add to assistant content
                assistantContent.push({
                  type: 'tool_use',
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input,
                })

                // Check if this is a server-side tool (load_skill)
                if (currentToolUse.name === 'load_skill') {
                  const skillName = input.name as string
                  const skill = resolvedSkills.find((s) => s.name === skillName)

                  if (DEBUG_LOGGING) {
                    console.log(
                      `[Server] Handling load_skill for: ${skillName}`,
                    )
                  }

                  if (skill) {
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: currentToolUse.id,
                      content: JSON.stringify({
                        loaded: true,
                        name: skill.name,
                      }),
                    })
                    extraTextBlocks.push({
                      type: 'text',
                      text: `# Skill: ${skill.name}\n\n${skill.content}`,
                    })
                    send(peer, {
                      type: 'server_tool_result',
                      tool: 'load_skill',
                      label: skill.label,
                    })
                  } else {
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: currentToolUse.id,
                      content: JSON.stringify({
                        error: `Skill '${skillName}' not found`,
                      }),
                      is_error: true,
                    })
                  }

                  currentToolUse = null
                  break
                }

                // Check if this is the load_tools server-side tool
                if (currentToolUse.name === 'load_tools') {
                  const names = (input.tools as string[]) || []
                  const loaded: string[] = []

                  for (const name of names) {
                    if (this.lazyTools.some((t) => t.name === name)) {
                      this.activatedLazyTools.add(name)
                      loaded.push(name)
                    }
                  }

                  if (DEBUG_LOGGING) {
                    console.log(
                      `[Server] Loaded lazy tools: ${loaded.join(', ')}`,
                    )
                  }

                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: currentToolUse.id,
                    content: JSON.stringify({ loaded }),
                  })

                  if (loaded.length) {
                    send(peer, {
                      type: 'server_tool_result',
                      tool: 'load_tools',
                      label: String(loaded.length),
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

                  if (DEBUG_LOGGING) {
                    console.log(
                      'Result:',
                      JSON.stringify(clientResult, null, 2),
                    )
                  }

                  if (clientResult.error) {
                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: currentToolUse.id,
                      content: JSON.stringify({ error: clientResult.error }),
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
                      const { agentMessage, ...rest } = resultForLLM as Record<
                        string,
                        unknown
                      >
                      resultForLLM = { ...rest, label: agentMessage }
                    }

                    toolResults.push({
                      type: 'tool_result',
                      tool_use_id: currentToolUse.id,
                      content: JSON.stringify(resultForLLM),
                    })
                  }
                } catch (error) {
                  if (DEBUG_LOGGING) {
                    console.log('Error:', error)
                  }

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

            case 'error':
              throw event.error
          }
        }

        // Check for abort after stream completes
        if (this.abortController?.signal.aborted) {
          break
        }

        if (DEBUG_LOGGING) {
          console.log(
            'Assistant content:',
            JSON.stringify(assistantContent, null, 2),
          )
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
            content: [...toolResults, ...extraTextBlocks],
          })
        }

        // If no tool calls were made, we're done
        if (toolResults.length === 0) {
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

      // Bug 2 fix: prune in finally so messages are compressed even after errors.
      pruneMessages(
        this.messages,
        KEEP_RECENT_TURNS,
        this.buildToolMetadataMap(),
      )

      // Send conversation state for client-side persistence
      this.sendConversationState(peer)
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

  private buildTranscript(): string {
    const lines: string[] = []

    // Add system prompt
    let systemPrompt = '(No page context available)'
    if (this.pageContext) {
      const resolvedSkills = resolveSkills(this.pageContext)
      const lazyToolSummaries = this.lazyTools.map((t) => ({
        name: t.name,
        description: t.description,
      }))
      systemPrompt = buildSystemPrompt(
        this.pageContext,
        resolvedSkills,
        lazyToolSummaries,
      )
    }

    lines.push('='.repeat(80))
    lines.push('SYSTEM PROMPT')
    lines.push('='.repeat(80))
    lines.push(systemPrompt)
    lines.push('')

    // Add conversation messages
    for (const message of this.messages) {
      lines.push('='.repeat(80))
      lines.push(`${message.role.toUpperCase()}`)
      lines.push('='.repeat(80))

      if (typeof message.content === 'string') {
        lines.push(message.content)
      } else if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === 'text') {
            lines.push(block.text)
          } else if (block.type === 'tool_use') {
            lines.push(`[Tool Call: ${block.name}]`)
            lines.push(JSON.stringify(block.input, null, 2))
          } else if (block.type === 'tool_result') {
            lines.push(`[Tool Result: ${block.tool_use_id}]`)
            try {
              lines.push(JSON.stringify(JSON.parse(block.content), null, 2))
            } catch {
              lines.push(block.content)
            }
          }
        }
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}
