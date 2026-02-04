import type { Peer, Message } from 'crossws'
import { defineWebSocketHandler, useRuntimeConfig } from '#imports'
import type {
  ClientMessage,
  PageContext,
  ClientToolDefinition,
} from '../shared/types'
import type { GenericMessage, GenericContentBlock } from './providers/types'
import type { ResolvedSkill } from './skills/types'
import { buildSystemPrompt } from './agentPrompt'
import { provider, aiModel } from '#blokkli-build/agent-server-config'
import { skills } from '#blokkli-build/agent-skills'

/**
 * Resolve skills for the given page context.
 * Calls getContents on each skill and filters out nulls.
 */
function resolveSkills(context: PageContext): ResolvedSkill[] {
  return skills
    .map((skill) => {
      const content = skill.getContents(context)
      if (content === null) return null
      return { name: skill.name, description: skill.description, content }
    })
    .filter((s): s is ResolvedSkill => s !== null)
}

/**
 * Transform text before sending to client or storing in conversation.
 * Replaces ß with ss for Swiss German audiences.
 */
function transformText(text: string): string {
  return text.replace(/ß/g, 'ss')
}

const DEBUG_LOGGING = true

/** Number of recent turns to keep uncompressed when pruning messages */
const KEEP_RECENT_TURNS = 8

// ============================================================================
// Types
// ============================================================================

type Session = {
  messages: GenericMessage[]
  pendingToolCalls: Map<
    string,
    {
      resolve: (result: { result: unknown; error?: string }) => void
      reject: (error: Error) => void
    }
  >
  abortController: AbortController | null
  isProcessing: boolean
  /** Tools received from client on init */
  tools: ClientToolDefinition[]
  /** Page context received from client on init */
  pageContext?: PageContext
}

// ============================================================================
// Session Management
// ============================================================================

const sessions = new Map<string, Session>()

function getOrCreateSession(peerId: string): Session {
  let session = sessions.get(peerId)
  if (!session) {
    session = {
      messages: [],
      pendingToolCalls: new Map(),
      abortController: null,
      isProcessing: false,
      tools: [],
    }
    sessions.set(peerId, session)
  }
  return session
}

function cleanupSession(peerId: string) {
  const session = sessions.get(peerId)
  if (session) {
    session.abortController?.abort()
    for (const pending of session.pendingToolCalls.values()) {
      pending.reject(new Error('Session closed'))
    }
    sessions.delete(peerId)
  }
}

// ============================================================================
// Message Pruning
// ============================================================================

/**
 * Compress a tool result to reduce token usage.
 * Extracts just the essential information from the result.
 */
function compressToolResult(content: string): string {
  try {
    const parsed = JSON.parse(content)

    // Query tools have a label field - use it as summary
    if (parsed.label) {
      return JSON.stringify({ summary: parsed.label })
    }

    // Error results - keep the error message
    if (parsed.error) {
      return JSON.stringify({ error: parsed.error })
    }

    // Mutation success - keep minimal info
    if (parsed.success !== undefined) {
      return JSON.stringify({ success: parsed.success })
    }

    // Interactive tools (ask_question, select_media) - keep selected value
    if (parsed.selected !== undefined) {
      return JSON.stringify({ selected: parsed.selected })
    }

    // Fallback - just note it was processed
    return JSON.stringify({ summary: 'completed' })
  } catch {
    // Not JSON or parse error - truncate if too long
    return content.length > 100 ? content.slice(0, 100) + '...' : content
  }
}

/**
 * Prune old messages to reduce context size.
 * Keeps recent messages intact, compresses old tool results to just their summary.
 *
 * A "turn" is defined as a user message followed by an assistant response.
 * We count turns by counting user messages (since each user message starts a turn).
 */
function pruneMessages(
  messages: GenericMessage[],
  keepRecentTurns: number,
): void {
  if (messages.length === 0) {
    return
  }

  // Count user messages to determine turns
  // Each user message (that's not just tool results) represents a new turn
  let turnCount = 0
  const turnStartIndices: number[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.role === 'user') {
      // Check if this is a "real" user message vs tool results
      // Tool results are arrays of { type: 'tool_result', ... }
      const content = msg.content
      const isToolResultOnly =
        Array.isArray(content) &&
        content.length > 0 &&
        content.every(
          (block) =>
            typeof block === 'object' &&
            block !== null &&
            'type' in block &&
            block.type === 'tool_result',
        )

      if (!isToolResultOnly) {
        turnCount++
        turnStartIndices.push(i)
      }
    }
  }

  // If we have fewer turns than the keep threshold, no pruning needed
  if (turnCount <= keepRecentTurns) {
    return
  }

  // Find the cutoff index - messages before this get pruned
  const cutoffTurnIndex = turnCount - keepRecentTurns
  const cutoffMessageIndex =
    turnStartIndices[cutoffTurnIndex] ?? messages.length

  if (DEBUG_LOGGING) {
    console.log(
      `\n[Pruning] ${turnCount} turns total, keeping ${keepRecentTurns} recent, pruning messages before index ${cutoffMessageIndex}`,
    )
  }

  // Prune messages before the cutoff
  for (let i = 0; i < cutoffMessageIndex; i++) {
    const msg = messages[i]
    const content = msg.content

    // Only process array content (tool results are in arrays)
    if (!Array.isArray(content)) {
      continue
    }

    // Compress tool_result blocks
    for (let j = 0; j < content.length; j++) {
      const block = content[j]
      if (block.type === 'tool_result') {
        const originalSize = block.content.length
        block.content = compressToolResult(block.content)

        if (DEBUG_LOGGING && originalSize > block.content.length) {
          console.log(
            `[Pruning] Compressed tool result: ${originalSize} -> ${block.content.length} chars`,
          )
        }
      }
    }
  }
}

// ============================================================================
// Agent Loop
// ============================================================================

async function runAgentLoop(
  peer: { send: (data: string) => void; id: string },
  session: Session,
  prompt: string,
  selectedUuids?: string[],
) {
  const config = useRuntimeConfig()

  // Get API key based on provider
  const providerName = provider.name
  const apiKey = config.blokkli?.agent?.apiKey

  if (!apiKey) {
    peer.send(
      JSON.stringify({
        type: 'error',
        message: `${providerName} API key not configured`,
      }),
    )
    return
  }

  if (session.tools.length === 0) {
    peer.send(
      JSON.stringify({
        type: 'error',
        message:
          'No tools available. Client must send init message with tools first.',
      }),
    )
    return
  }

  if (!session.pageContext) {
    peer.send(
      JSON.stringify({
        type: 'error',
        message:
          'No page context available. Client must send init message with pageContext first.',
      }),
    )
    return
  }

  // Resolve skills for this page context
  const resolvedSkills = resolveSkills(session.pageContext)

  const systemPrompt = buildSystemPrompt(session.pageContext, resolvedSkills)

  // Build initial user message with context about selection
  let userContent = prompt
  if (selectedUuids?.length) {
    userContent = `[User has selected the following blocks: ${selectedUuids.join(', ')}]\n\n${prompt}`
  }

  session.messages.push({
    role: 'user',
    content: userContent,
  })

  session.abortController = new AbortController()
  session.isProcessing = true
  let toolCallCounter = 0

  try {
    while (true) {
      // Check for abort
      if (session.abortController.signal.aborted) {
        break
      }

      // Send thinking indicator
      peer.send(JSON.stringify({ type: 'thinking' }))

      if (DEBUG_LOGGING) {
        console.log('\n========== AGENT LOOP ITERATION ==========')
        console.log('Messages:', JSON.stringify(session.messages, null, 2))
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

      // Combine server tools with client tools
      const allTools = [...serverTools, ...session.tools]

      // Create stream using the provider
      const stream = provider.createStream(
        { apiKey, model: aiModel },
        {
          systemPrompt,
          messages: session.messages,
          tools: allTools,
          maxTokens: 4096,
          signal: session.abortController.signal,
        },
      )

      // Process stream events
      for await (const event of stream) {
        // Check for abort during streaming
        if (session.abortController?.signal.aborted) {
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
              peer.send(
                JSON.stringify({ type: 'text_delta', content: transformed }),
              )
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
                  console.log(`[Server] Handling load_skill for: ${skillName}`)
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

              // Send tool call to client
              peer.send(
                JSON.stringify({
                  type: 'tool_call',
                  callId,
                  tool: currentToolUse.name,
                  params: input as Record<string, unknown>,
                }),
              )

              // Wait for client to respond
              try {
                const clientResult = await waitForToolResult(session, callId)

                if (DEBUG_LOGGING) {
                  console.log('Result:', JSON.stringify(clientResult, null, 2))
                }

                if (clientResult.error) {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: currentToolUse.id,
                    content: JSON.stringify({ error: clientResult.error }),
                    is_error: true,
                  })
                } else {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: currentToolUse.id,
                    content: JSON.stringify(clientResult.result),
                  })
                }
              } catch (error) {
                if (DEBUG_LOGGING) {
                  console.log('Error:', error)
                }

                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: currentToolUse.id,
                  content: JSON.stringify({ error: (error as Error).message }),
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
      if (session.abortController?.signal.aborted) {
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
        session.messages.push({
          role: 'assistant',
          content: assistantContent,
        })
      }

      // Add tool results to history if we have any
      if (toolResults.length) {
        session.messages.push({
          role: 'user',
          content: toolResults,
        })
      }

      // If no tool calls were made, we're done
      if (toolResults.length === 0) {
        const finalMessage = assistantContent
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((t) => t.text)
          .join('\n')
          .trim()
        peer.send(
          JSON.stringify({ type: 'done', message: finalMessage || undefined }),
        )
        break
      }
    }

    // Prune old messages to reduce context size for future turns
    pruneMessages(session.messages, KEEP_RECENT_TURNS)
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Agent loop error:', error)
      peer.send(
        JSON.stringify({
          type: 'error',
          message: (error as Error).message || 'An error occurred',
        }),
      )
    }
  } finally {
    session.isProcessing = false
    session.abortController = null
  }
}

function waitForToolResult(
  session: Session,
  callId: string,
): Promise<{ result: unknown; error?: string }> {
  return new Promise((resolve, reject) => {
    // No timeout - user may take time to approve/reject mutations.
    // Cleanup is handled by the WebSocket close handler if client disconnects.
    session.pendingToolCalls.set(callId, {
      resolve: (result) => {
        session.pendingToolCalls.delete(callId)
        resolve(result)
      },
      reject: (error) => {
        session.pendingToolCalls.delete(callId)
        reject(error)
      },
    })
  })
}

/**
 * Build a plaintext transcript of the conversation for debugging.
 */
function buildTranscript(session: Session): string {
  const lines: string[] = []

  // Add system prompt
  let systemPrompt = '(No page context available)'
  if (session.pageContext) {
    const resolvedSkills = resolveSkills(session.pageContext)
    systemPrompt = buildSystemPrompt(session.pageContext, resolvedSkills)
  }

  lines.push('='.repeat(80))
  lines.push('SYSTEM PROMPT')
  lines.push('='.repeat(80))
  lines.push(systemPrompt)
  lines.push('')

  // Add conversation messages
  for (const message of session.messages) {
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
          lines.push(block.content)
        }
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================================
// WebSocket Handler
// ============================================================================

export default defineWebSocketHandler({
  open(peer: Peer) {
    if (DEBUG_LOGGING) {
      console.log(`\n[WebSocket] Client connected: ${peer.id}`)
    }
    getOrCreateSession(peer.id)
  },

  async message(peer: Peer, message: Message) {
    try {
      const data = JSON.parse(message.text()) as ClientMessage
      const session = getOrCreateSession(peer.id)

      if (DEBUG_LOGGING) {
        console.log(`\n[WebSocket] Message from ${peer.id}:`, data.type)
      }

      switch (data.type) {
        case 'init':
          // Store tools and block context sent by client
          session.tools = data.tools
          session.pageContext = data.pageContext
          if (DEBUG_LOGGING) {
            console.log(
              `[WebSocket] Received ${session.tools.length} tools from client`,
            )
            console.log(
              `[WebSocket] Received page context with ${session.pageContext?.bundles.length ?? 0} block bundles from client`,
            )
          }
          break

        case 'start':
          if (session.isProcessing) {
            peer.send(
              JSON.stringify({
                type: 'error',
                message: 'Agent is already processing a request',
              }),
            )
            return
          }
          runAgentLoop(peer, session, data.prompt, data.selectedUuids)
          break

        case 'tool_result':
          const pending = session.pendingToolCalls.get(data.callId)
          if (pending) {
            pending.resolve({ result: data.result, error: data.error })
          }
          break

        case 'cancel':
          session.abortController?.abort()
          // Don't clear conversation - just note that the operation was cancelled
          peer.send(JSON.stringify({ type: 'done', message: 'Cancelled' }))
          break

        case 'accept':
          session.messages.push({
            role: 'user',
            content: `[System: Changes accepted and applied.]`,
          })
          peer.send(
            JSON.stringify({ type: 'done', message: 'Changes accepted' }),
          )
          break

        case 'reject':
          // Tell Claude the changes were rejected so it knows the state
          session.messages.push({
            role: 'user',
            content: `[System: Changes rejected. All pending changes have been reverted. The page is back to its previous state.]`,
          })
          peer.send(
            JSON.stringify({ type: 'done', message: 'Changes rejected' }),
          )
          break

        case 'get_transcript':
          peer.send(
            JSON.stringify({
              type: 'transcript',
              content: buildTranscript(session),
            }),
          )
          break
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
      peer.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        }),
      )
    }
  },

  close(peer: Peer) {
    if (DEBUG_LOGGING) {
      console.log(`\n[WebSocket] Client disconnected: ${peer.id}`)
    }
    cleanupSession(peer.id)
  },

  error(peer: Peer, error: Error) {
    console.error(`[WebSocket] Error for ${peer.id}:`, error)
    cleanupSession(peer.id)
  },
})
