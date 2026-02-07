import { useRuntimeConfig } from '#imports'
import type {
  ServerMessage,
  PageContext,
  ClientToolDefinition,
} from '../shared/types'
import type { GenericMessage, GenericContentBlock } from './providers/types'
import { buildSystemPrompt } from './agentPrompt'
import { provider, aiModel } from '#blokkli-build/agent-server'
import {
  DEBUG_LOGGING,
  KEEP_RECENT_TURNS,
  resolveSkills,
  transformText,
  classifyError,
  pruneMessages,
} from './helpers'

// ============================================================================
// Type-safe send helper
// ============================================================================

type Peer = { send: (data: string) => void; id: string }

function send(peer: Peer, message: ServerMessage): void {
  peer.send(JSON.stringify(message))
}

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
    send(peer, { type: 'done' })
  }

  acceptChanges(peer: Peer): void {
    this.messages.push({
      role: 'user',
      content: `[System: Changes accepted and applied.]`,
    })
    send(peer, { type: 'done', message: 'Changes accepted' })
  }

  rejectChanges(peer: Peer): void {
    this.messages.push({
      role: 'user',
      content: `[System: Changes rejected. All pending changes have been reverted. The page is back to its previous state.]`,
    })
    send(peer, { type: 'done', message: 'Changes rejected' })
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
  }

  cleanup(): void {
    this.abortController?.abort()
    for (const pending of this.pendingToolCalls.values()) {
      pending.reject(new Error('Session closed'))
    }
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

        if (DEBUG_LOGGING) {
          console.log('\n========== AGENT LOOP ITERATION ==========')
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
                        guidelines: skill.content,
                      }),
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
            content: toolResults,
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

      // Prune old messages to reduce context size for future turns
      pruneMessages(this.messages, KEEP_RECENT_TURNS)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Agent loop error:', error)
        const classified = classifyError(error)
        send(peer, { type: 'error', ...classified })
      }
    } finally {
      this.isProcessing = false
      this.abortController = null
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
