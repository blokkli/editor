import Anthropic from '@anthropic-ai/sdk'
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages'

const DEBUG_LOGGING = true

// ============================================================================
// Types
// ============================================================================

type ClientMessage =
  | { type: 'start'; prompt: string; selectedUuids?: string[] }
  | { type: 'tool_result'; callId: string; result: unknown; error?: string }
  | { type: 'cancel' }
  | { type: 'accept'; createdBlocks?: Record<string, string> }
  | { type: 'reject' }

type Session = {
  messages: MessageParam[]
  pendingToolCalls: Map<
    string,
    {
      resolve: (result: { result: unknown; error?: string }) => void
      reject: (error: Error) => void
    }
  >
  abortController: AbortController | null
  isProcessing: boolean
}

// ============================================================================
// Tool Definitions
// ============================================================================

const QUERY_TOOLS: Tool[] = [
  {
    name: 'get_block_info',
    description: 'Get detailed information about a specific block by its UUID',
    input_schema: {
      type: 'object' as const,
      properties: {
        uuid: {
          type: 'string',
          description: 'The block UUID',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'get_editable_fields',
    description:
      'Get all editable text fields for a block and optionally its nested children',
    input_schema: {
      type: 'object' as const,
      properties: {
        uuid: {
          type: 'string',
          description: 'The block UUID',
        },
        includeNested: {
          type: 'boolean',
          description: 'Whether to include fields from nested child blocks',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'get_children',
    description: 'Get the child blocks of a block in a specific field',
    input_schema: {
      type: 'object' as const,
      properties: {
        uuid: {
          type: 'string',
          description: 'The parent block UUID',
        },
        fieldName: {
          type: 'string',
          description: 'The field name containing children',
        },
      },
      required: ['uuid', 'fieldName'],
    },
  },
  {
    name: 'get_block_fields',
    description:
      'Get all block reference fields on a block (fields that can contain child blocks)',
    input_schema: {
      type: 'object' as const,
      properties: {
        uuid: {
          type: 'string',
          description: 'The block UUID',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'get_page_structure',
    description:
      'Get the full page structure including all blocks and their hierarchy',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_visible_blocks',
    description:
      'Get the blocks currently visible in the viewport. Returns a tree of root-level blocks with their children. Use this when no blocks are selected to understand what the user can see. Each block includes a visibility percentage indicating how much of it is in the viewport.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_available_bundles',
    description: 'Get the block types that can be added to a specific field',
    input_schema: {
      type: 'object' as const,
      properties: {
        hostUuid: {
          type: 'string',
          description: 'The host entity UUID',
        },
        fieldName: {
          type: 'string',
          description: 'The field name',
        },
      },
      required: ['hostUuid', 'fieldName'],
    },
  },
]

const MUTATION_TOOLS: Tool[] = [
  {
    name: 'rewrite_text',
    description: 'Rewrite the text content of an editable field',
    input_schema: {
      type: 'object' as const,
      properties: {
        uuid: {
          type: 'string',
          description: 'The block UUID containing the field',
        },
        fieldName: {
          type: 'string',
          description: 'The field name to update',
        },
        value: {
          type: 'string',
          description: 'The new text content',
        },
      },
      required: ['uuid', 'fieldName', 'value'],
    },
  },
  {
    name: 'add_block',
    description:
      'Add a new block to the page. Returns success status. After user accepts, you will receive the real UUID for this block.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tempId: {
          type: 'string',
          description:
            'A temporary ID you assign to track this block. You will receive the real UUID mapped to this tempId after the user accepts changes.',
        },
        bundle: {
          type: 'string',
          description: 'The block type to add',
        },
        hostEntityType: {
          type: 'string',
          description:
            'The entity type of the host (from parentEntityType in get_block_info, or entityType from get_page_structure)',
        },
        hostUuid: {
          type: 'string',
          description: 'The UUID of the host entity',
        },
        hostFieldName: {
          type: 'string',
          description: 'The field name on the host to add the block to',
        },
        afterUuid: {
          type: ['string', 'null'],
          description: 'UUID of block to insert after, or null for beginning',
        },
        fields: {
          type: 'object',
          description: 'Initial field values for the new block',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['tempId', 'bundle', 'hostEntityType', 'hostUuid', 'hostFieldName', 'fields'],
    },
  },
  {
    name: 'delete_block',
    description: 'Delete a block from the page',
    input_schema: {
      type: 'object' as const,
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the block to delete',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'move_block',
    description: 'Move a block to a new position',
    input_schema: {
      type: 'object' as const,
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the block to move',
        },
        hostEntityType: {
          type: 'string',
          description:
            'The entity type of the target host (from parentEntityType in get_block_info, or entityType from get_page_structure)',
        },
        hostUuid: {
          type: 'string',
          description: 'The target host entity UUID',
        },
        hostFieldName: {
          type: 'string',
          description: 'The target field name',
        },
        afterUuid: {
          type: ['string', 'null'],
          description: 'UUID of block to insert after, or null for beginning',
        },
      },
      required: ['uuid', 'hostEntityType', 'hostUuid', 'hostFieldName'],
    },
  },
]

const ALL_TOOLS = [...QUERY_TOOLS, ...MUTATION_TOOLS]

// ============================================================================
// System Prompt
// ============================================================================

const AGENT_SYSTEM_PROMPT = `You are an AI assistant helping users edit page content in a block-based editor called blokkli.

You have access to tools to:
- Query the page structure and block information
- Rewrite text content in editable fields
- Add new blocks
- Delete blocks
- Move blocks to different locations

WORKFLOW:
1. When the user asks you to do something, FIRST use query tools to understand the current state
2. Use get_block_info to learn about specific blocks
3. Use get_editable_fields with includeNested=true to find all text that can be edited
4. Use get_block_fields to discover what child fields a block has
5. Use get_available_bundles to see what block types can be added to a field
6. THEN use mutation tools to make the requested changes

IMPORTANT:
- Always verify the structure before making changes
- The user may give hints about selection, but always confirm with query tools
- For markup fields, preserve HTML structure
- For plain fields, use plain text only
- When adding blocks, make sure to populate all required text fields

After making changes, briefly confirm what you did.`

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
// Agent Loop
// ============================================================================

async function runAgentLoop(
  peer: { send: (data: string) => void; id: string },
  session: Session,
  prompt: string,
  selectedUuids?: string[],
) {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicKey as string

  if (!apiKey) {
    peer.send(
      JSON.stringify({
        type: 'error',
        message: 'Anthropic API key not configured',
      }),
    )
    return
  }

  const anthropic = new Anthropic({ apiKey })

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

      // Use streaming API
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: AGENT_SYSTEM_PROMPT,
        messages: session.messages,
        tools: ALL_TOOLS,
      })

      // Track content blocks as they complete
      const assistantContent: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: unknown }
      > = []
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

      // Process stream events
      for await (const event of stream) {
        // Check for abort during streaming
        if (session.abortController?.signal.aborted) {
          break
        }

        if (DEBUG_LOGGING && event.type !== 'content_block_delta') {
          console.log('Stream event:', event.type)
        }

        // Handle text block start
        if (
          event.type === 'content_block_start' &&
          event.content_block.type === 'text'
        ) {
          currentTextContent = ''
        }

        // Handle text delta - stream to client immediately
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          currentTextContent += event.delta.text
          peer.send(
            JSON.stringify({ type: 'text_delta', content: event.delta.text }),
          )
        }

        // Handle tool use block start
        if (
          event.type === 'content_block_start' &&
          event.content_block.type === 'tool_use'
        ) {
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            inputJson: '',
          }
        }

        // Handle tool use input delta - accumulate JSON
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'input_json_delta'
        ) {
          if (currentToolUse) {
            currentToolUse.inputJson += event.delta.partial_json
          }
        }

        // Handle content block stop
        if (event.type === 'content_block_stop') {
          // If we were building a text block, add it to content
          if (currentTextContent) {
            assistantContent.push({
              type: 'text',
              text: currentTextContent,
            })
            currentTextContent = ''
          }

          // If we were building a tool use block, process it
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
    // Set a timeout
    const timeout = setTimeout(() => {
      session.pendingToolCalls.delete(callId)
      reject(new Error('Tool call timeout'))
    }, 30000) // 30 second timeout

    session.pendingToolCalls.set(callId, {
      resolve: (result) => {
        clearTimeout(timeout)
        session.pendingToolCalls.delete(callId)
        resolve(result)
      },
      reject: (error) => {
        clearTimeout(timeout)
        session.pendingToolCalls.delete(callId)
        reject(error)
      },
    })
  })
}

// ============================================================================
// WebSocket Handler
// ============================================================================

export default defineWebSocketHandler({
  open(peer) {
    if (DEBUG_LOGGING) {
      console.log(`\n[WebSocket] Client connected: ${peer.id}`)
    }
    getOrCreateSession(peer.id)
  },

  async message(peer, message) {
    try {
      const data = JSON.parse(message.text()) as ClientMessage
      const session = getOrCreateSession(peer.id)

      if (DEBUG_LOGGING) {
        console.log(`\n[WebSocket] Message from ${peer.id}:`, data.type)
      }

      switch (data.type) {
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
          // If blocks were created, inject their UUIDs into the conversation
          // so Claude knows the real UUIDs for subsequent prompts
          if (data.createdBlocks && Object.keys(data.createdBlocks).length > 0) {
            const mappingInfo = Object.entries(data.createdBlocks)
              .map(([tempId, uuid]) => `${tempId} is now ${uuid}`)
              .join(', ')
            session.messages.push({
              role: 'user',
              content: `[System: Changes accepted. Created blocks: ${mappingInfo}. Use these UUIDs for any future operations on these blocks.]`,
            })
          } else {
            session.messages.push({
              role: 'user',
              content: `[System: Changes accepted.]`,
            })
          }
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

  close(peer) {
    if (DEBUG_LOGGING) {
      console.log(`\n[WebSocket] Client disconnected: ${peer.id}`)
    }
    cleanupSession(peer.id)
  },

  error(peer, error) {
    console.error(`[WebSocket] Error for ${peer.id}:`, error)
    cleanupSession(peer.id)
  },
})
