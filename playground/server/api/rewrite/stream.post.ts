import Anthropic from '@anthropic-ai/sdk'
import { useRuntimeConfig } from '#imports'
import { defineEventHandler, readBody, createError, setHeader } from 'h3'
import type { Tool } from '@anthropic-ai/sdk/resources/messages'

const config = useRuntimeConfig()

const DEBUG_LOGGING = false

type RewriteFieldInfo = {
  uuid: string
  fieldName: string
  currentValue: string
  type: 'plain' | 'markup'
  previousAttempt?: string
}

type RewriteMessage = {
  role: 'user' | 'assistant'
  content: string
}

type RewriteContextField = {
  uuid: string
  fieldName: string
  originalValue: string
  acceptedValue: string
  type: 'plain' | 'markup'
}

type RewriteBlockContext = {
  uuid: string
  bundle: string
  fields: Record<string, string>
  host?: {
    uuid: string
    fieldName: string
  }
  afterUuid?: string | null
}

type RewriteContext = {
  blocks: RewriteBlockContext[]
  availableBundles?: Array<{
    bundle: string
    label: string
    fields: string[]
  }>
}

type RewriteRequest = {
  fields: RewriteFieldInfo[]
  prompt: string
  history?: RewriteMessage[]
  context?: RewriteContextField[]
  blockContext?: RewriteContext
  useTools?: boolean
}

// System prompt for tool-based mode
const TOOL_SYSTEM_PROMPT = `You are a content editing assistant that helps users modify page content. You have access to tools to rewrite text and add new blocks.

IMPORTANT RULES:
1. Use rewrite_text to modify existing text content
2. Use add_block to add new blocks when the user asks to add content
3. For "plain" type fields: use plain text only (no HTML)
4. For "markup" type fields: preserve HTML structure but modify the text content
5. When improving a previous rewrite, apply the new instruction while KEEPING all changes from previous instructions
6. Be concise and helpful

When the user asks you to add content (like "add a card", "create a new block", etc.), use the add_block tool.
When the user asks you to change/rewrite/modify existing text, use the rewrite_text tool.`

// Legacy system prompt for text-only mode
const LEGACY_SYSTEM_PROMPT = `You are a content rewriting assistant. You help users rewrite text content according to their instructions.

IMPORTANT RULES:
1. Rewrite each text according to the user's instructions
2. Maintain the same general meaning unless told otherwise
3. For "plain" type: return plain text only (no HTML)
4. For "markup" type: preserve HTML structure but rewrite the text content
5. IMPORTANT: When improving a previous rewrite, apply the new instruction while KEEPING all changes from previous instructions. Never revert earlier corrections.

OUTPUT FORMAT - Use this exact format with numbered markers:
- Start each text with: <<<N>>> (where N is the text number: 1, 2, 3, etc.)
- Write the rewritten content directly
- End each text with: <<<END>>>

Example for 2 texts:
<<<1>>>
My Rewritten First Text
<<<END>>>
<<<2>>>
My rewritten second text that can span multiple lines.
<<<END>>>

Output ONLY the markers and content. No explanations.`

function buildTools(request: RewriteRequest): Tool[] {
  const tools: Tool[] = []

  // rewrite_text tool - always available if there are fields
  if (request.fields.length > 0) {
    const fieldDescriptions = request.fields
      .map(
        (f) => `- uuid: "${f.uuid}", fieldName: "${f.fieldName}" (${f.type})`,
      )
      .join('\n')

    tools.push({
      name: 'rewrite_text',
      description: `Rewrite the text content of an editable field. Available fields:\n${fieldDescriptions}`,
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
            description: 'The new text content for the field',
          },
        },
        required: ['uuid', 'fieldName', 'value'],
      },
    })
  }

  // add_block tool - available if we have block context with available bundles
  if (request.blockContext?.availableBundles?.length) {
    const bundleDescriptions = request.blockContext.availableBundles
      .map((b) => `- ${b.bundle} (${b.label}): fields [${b.fields.join(', ')}]`)
      .join('\n')

    // Get host info from blocks
    const hostOptions = request.blockContext.blocks
      .map((b) => {
        if (b.host) {
          return `- hostUuid: "${b.host.uuid}", hostFieldName: "${b.host.fieldName}"`
        }
        return null
      })
      .filter(Boolean)
      .join('\n')

    tools.push({
      name: 'add_block',
      description: `Add a new block to the page. Available bundles:\n${bundleDescriptions}\n\nHost options:\n${hostOptions || "Use the first block's host info"}`,
      input_schema: {
        type: 'object' as const,
        properties: {
          bundle: {
            type: 'string',
            description: 'The block bundle type to add',
            enum: request.blockContext.availableBundles.map((b) => b.bundle),
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
            description:
              'UUID of block to insert after, or null to insert at the beginning',
          },
          fields: {
            type: 'object',
            description: 'Initial field values for the new block',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['bundle', 'hostUuid', 'hostFieldName', 'fields'],
      },
    })
  }

  return tools
}

function buildUserMessage(request: RewriteRequest): string {
  const isRefinement = request.fields.some((f) => f.previousAttempt)

  if (isRefinement) {
    const previousInstructions =
      request.history
        ?.filter((m) => m.role === 'user')
        .map((m) => m.content)
        .slice(0, -1) || []

    const textsToFix = request.fields
      .map((f, i) => {
        const num = i + 1
        const prevAttempt = (f.previousAttempt || '').trim()
        return `Text ${num} (uuid: ${f.uuid}, field: ${f.fieldName}): "${prevAttempt}"`
      })
      .join('\n')

    let allInstructions = ''
    if (previousInstructions.length > 0) {
      allInstructions = `Previous instructions that must still be followed:\n${previousInstructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\n`
    }

    return `${allInstructions}Current text to fix:
${textsToFix}

New instruction: "${request.prompt}"

Apply ALL instructions (previous + new) using the appropriate tools.`
  }

  // Build context about blocks
  let blocksContext = ''
  if (request.blockContext?.blocks.length) {
    blocksContext =
      '\n\nBlocks in selection:\n' +
      request.blockContext.blocks
        .map((b) => {
          const fieldsStr = Object.entries(b.fields)
            .map(([k, v]) => `  - ${k}: "${v}"`)
            .join('\n')
          return `- ${b.bundle} (uuid: ${b.uuid}):\n${fieldsStr}`
        })
        .join('\n')
  }

  // Build fields context
  const fieldsContext = request.fields
    .map(
      (f) =>
        `- uuid: "${f.uuid}", field: "${f.fieldName}" (${f.type}): "${f.currentValue}"`,
    )
    .join('\n')

  return `User instruction: "${request.prompt}"

Editable fields:
${fieldsContext}${blocksContext}

Use the appropriate tools to fulfill the user's request.`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RewriteRequest>(event)

  if (!body || !body.fields || !body.prompt) {
    throw createError({ statusCode: 400, message: 'Missing fields or prompt' })
  }

  const apiKey = config.anthropicKey as string
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'Anthropic API key not configured',
    })
  }

  const anthropic = new Anthropic({
    apiKey,
  })

  // Set up SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  const encoder = new TextEncoder()

  // Determine if we should use tool mode
  const useToolMode = body.useTools && body.blockContext

  if (useToolMode) {
    // Tool-based mode using Claude's native tool_use
    return handleToolMode(body, anthropic, encoder)
  } else {
    // Legacy marker-based mode for backward compatibility
    return handleLegacyMode(body, anthropic, encoder)
  }
})

async function handleToolMode(
  body: RewriteRequest,
  anthropic: Anthropic,
  encoder: TextEncoder,
) {
  const tools = buildTools(body)
  const userMessage = buildUserMessage(body)

  if (DEBUG_LOGGING) {
    console.log('\n========== TOOL MODE REQUEST ==========')
    console.log('Tools:', JSON.stringify(tools, null, 2))
    console.log('User message:', userMessage)
    console.log('========================================\n')
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: userMessage },
  ]

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: TOOL_SYSTEM_PROMPT,
    messages,
    tools,
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const sendEvent = (data: object) => {
          const sseData = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(sseData))
        }

        let toolCallCounter = 0
        const toolCalls: Array<{
          id: string
          name: string
          input: Record<string, any>
        }> = []
        let currentToolUse: {
          id: string
          name: string
          inputJson: string
        } | null = null

        for await (const event of stream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              currentToolUse = {
                id: `tc_${toolCallCounter++}`,
                name: event.content_block.name,
                inputJson: '',
              }
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'input_json_delta' && currentToolUse) {
              currentToolUse.inputJson += event.delta.partial_json
            }
          } else if (event.type === 'content_block_stop') {
            if (currentToolUse) {
              try {
                const input = JSON.parse(currentToolUse.inputJson)
                toolCalls.push({
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input,
                })

                // Emit tool_call chunk
                if (currentToolUse.name === 'rewrite_text') {
                  sendEvent({
                    type: 'tool_call',
                    id: currentToolUse.id,
                    tool: {
                      name: 'rewrite_text',
                      params: {
                        uuid: input.uuid,
                        fieldName: input.fieldName,
                        value: input.value,
                      },
                    },
                  })
                } else if (currentToolUse.name === 'add_block') {
                  sendEvent({
                    type: 'tool_call',
                    id: currentToolUse.id,
                    tool: {
                      name: 'add_block',
                      params: {
                        tempId: currentToolUse.id,
                        bundle: input.bundle,
                        hostUuid: input.hostUuid,
                        hostFieldName: input.hostFieldName,
                        afterUuid: input.afterUuid ?? null,
                        fields: input.fields || {},
                      },
                    },
                  })
                }
              } catch (e) {
                if (DEBUG_LOGGING) {
                  console.error('Failed to parse tool input:', e)
                }
              }
              currentToolUse = null
            }
          }
        }

        if (DEBUG_LOGGING) {
          console.log('\n--- TOOL CALLS ---')
          toolCalls.forEach((tc) => {
            console.log(`[${tc.id}] ${tc.name}:`, tc.input)
          })
          console.log('--- END TOOL CALLS ---\n')
        }

        // Send completion signal
        sendEvent({ complete: true, toolCalls })

        controller.close()
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        const sseData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`
        controller.enqueue(encoder.encode(sseData))
        controller.close()
      }
    },
  })

  return readable
}

async function handleLegacyMode(
  body: RewriteRequest,
  anthropic: Anthropic,
  encoder: TextEncoder,
) {
  const isRefinement = body.fields.some((f) => f.previousAttempt)

  let userMessage: string

  if (isRefinement) {
    const previousInstructions =
      body.history
        ?.filter((m) => m.role === 'user')
        .map((m) => m.content)
        .slice(0, -1) || []

    const textsToFix = body.fields
      .map((f, i) => {
        const num = i + 1
        const prevAttempt = (f.previousAttempt || '').trim()
        return `Text ${num}: "${prevAttempt}"`
      })
      .join('\n')

    let allInstructions = ''
    if (previousInstructions.length > 0) {
      allInstructions = `Previous instructions that must still be followed:\n${previousInstructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\n`
    }

    userMessage = `${allInstructions}Current text to fix:
${textsToFix}

New instruction: "${body.prompt}"

Rewrite the text applying ALL instructions (previous + new). Output the corrected version.`
  } else {
    const textsToRewrite = body.fields
      .map((f, i) => {
        const num = i + 1
        return `Text ${num} (${f.type}): "${f.currentValue}"`
      })
      .join('\n')

    userMessage = `Please rewrite the following texts according to this instruction: "${body.prompt}"

${textsToRewrite}`
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: userMessage },
  ]

  if (DEBUG_LOGGING) {
    console.log('\n========== LEGACY MODE REQUEST ==========')
    console.log('Is refinement:', isRefinement)
    console.log('User message:', userMessage)
    console.log('==========================================\n')
  }

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: LEGACY_SYSTEM_PROMPT,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        let buffer = ''
        let currentFieldIndex: number | null = null
        let currentContent = ''
        const completedFields: Array<{
          uuid: string
          fieldName: string
          value: string
        }> = []

        const START_MARKER = /<<<(\d+)>>>/
        const END_MARKER = '<<<END>>>'

        const getFieldByIndex = (index: number) => {
          const field = body.fields[index - 1]
          return field ? { uuid: field.uuid, fieldName: field.fieldName } : null
        }

        const sendEvent = (data: object) => {
          const sseData = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(sseData))
        }

        const processBuffer = () => {
          while (true) {
            if (currentFieldIndex === null) {
              const match = buffer.match(START_MARKER)
              if (match && match.index !== undefined) {
                buffer = buffer.slice(match.index + match[0].length)
                currentFieldIndex = parseInt(match[1]!, 10)
                currentContent = ''
                if (buffer.startsWith('\n')) {
                  buffer = buffer.slice(1)
                }
              } else {
                break
              }
            } else {
              const endIndex = buffer.indexOf(END_MARKER)
              const fieldInfo = getFieldByIndex(currentFieldIndex)

              if (endIndex !== -1) {
                const content = buffer.slice(0, endIndex)
                currentContent += content
                currentContent = currentContent.trim()
                buffer = buffer.slice(endIndex + END_MARKER.length)

                if (fieldInfo) {
                  sendEvent({
                    uuid: fieldInfo.uuid,
                    fieldName: fieldInfo.fieldName,
                    value: currentContent,
                    done: true,
                  })

                  completedFields.push({
                    uuid: fieldInfo.uuid,
                    fieldName: fieldInfo.fieldName,
                    value: currentContent,
                  })
                }

                currentFieldIndex = null
                currentContent = ''
              } else {
                if (buffer.length > END_MARKER.length) {
                  const safeLength = buffer.length - END_MARKER.length
                  const content = buffer.slice(0, safeLength)
                  currentContent += content
                  buffer = buffer.slice(safeLength)

                  if (content && fieldInfo) {
                    sendEvent({
                      uuid: fieldInfo.uuid,
                      fieldName: fieldInfo.fieldName,
                      value: currentContent,
                      done: false,
                    })
                  }
                }
                break
              }
            }
          }
        }

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            buffer += event.delta.text
            processBuffer()
          }
        }

        if (currentFieldIndex !== null && buffer) {
          const remainingFieldInfo = getFieldByIndex(currentFieldIndex)
          if (remainingFieldInfo) {
            currentContent += buffer
            currentContent = currentContent.trim()
            sendEvent({
              uuid: remainingFieldInfo.uuid,
              fieldName: remainingFieldInfo.fieldName,
              value: currentContent,
              done: true,
            })
            completedFields.push({
              uuid: remainingFieldInfo.uuid,
              fieldName: remainingFieldInfo.fieldName,
              value: currentContent,
            })
          }
        }

        if (DEBUG_LOGGING) {
          console.log('\n--- CLAUDE OUTPUT ---')
          completedFields.forEach((f, i) => {
            console.log(`[${i + 1}] "${f.value}"`)
          })
          console.log('--- END OUTPUT ---\n')
        }

        sendEvent({ complete: true, fields: completedFields })

        controller.close()
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        const sseData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`
        controller.enqueue(encoder.encode(sseData))
        controller.close()
      }
    },
  })

  return readable
}
