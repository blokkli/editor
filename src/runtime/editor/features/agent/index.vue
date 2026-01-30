<template>
  <PluginSidebar
    id="agent"
    :title="$t('aiAgent', 'AI Agent')"
    :tour-text="$t('aiAgentTourText', 'Chat with an AI assistant to edit page content.')"
    icon="stars"
    weight="-10"
  >
    <AgentPanel
      v-if="isConnected"
      :conversation="conversation"
      :is-processing="isProcessing"
      :pending-changes="pendingChanges"
      @send-prompt="onSendPrompt"
      @accept="onAccept"
      @reject="onReject"
      @cancel="onCancel"
      @debug="onDebug"
    />
    <div v-else class="bk-agent-connecting">
      <Icon name="loader" />
      <span>{{ $t('aiAgentConnecting', 'Connecting...') }}</span>
    </div>

    <template v-if="pendingChanges.length" #badge>
      <div class="bk-sidebar-badge bk-is-yellow">{{ pendingChanges.length }}</div>
    </template>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  defineBlokkliFeature,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { Icon } from '#blokkli/editor/components'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import AgentPanel from './Panel/index.vue'
import type {
  ClientMessage,
  ServerMessage,
  AgentMessage,
  PendingChange,
  ActiveToolCall,
  BlockInfoResult,
  EditableFieldResult,
  ChildBlockResult,
  BlockFieldResult,
  PageStructureResult,
  AvailableBundleResult,
  VisibleBlocksResult,
  VisibleBlock,
} from './types'
import { itemEntityType } from '#blokkli-build/config'

const { adapter } = defineBlokkliFeature({
  id: 'agent',
  icon: 'stars',
  label: 'AI Agent',
  description: 'Chat with an AI assistant to edit page content.',
  requiredAdapterMethods: ['updateFieldValue', 'addNewBlock', 'deleteBlocks', 'moveMultipleBlocks'],
})

const { $t, state, dom, ui, directive, blocks, types, definitions, selection, context, fields } = useBlokkli()

// WebSocket connection state
const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
const isProcessing = ref(false)

// Agent state
const conversation = ref<AgentMessage[]>([])
const pendingChanges = ref<PendingChange[]>([])
const activeToolCalls = ref<ActiveToolCall[]>([])

// Original values for reverting
const originalValues = ref<Record<string, Record<string, string>>>({})

// Debug log for WebSocket messages
type DebugMessage = { direction: 'sent' | 'received'; timestamp: number; data: unknown }
const debugLog = ref<DebugMessage[]>([])

// Map agent's tempId to the actual UUID we generate
const tempIdToUuid: Record<string, string> = {}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// WebSocket Connection
// ============================================================================

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${window.location.host}/api/agent`

  ws.value = new WebSocket(url)

  ws.value.onopen = () => {
    isConnected.value = true
  }

  ws.value.onclose = () => {
    isConnected.value = false
    isProcessing.value = false
    // Try to reconnect after a delay
    setTimeout(() => {
      if (!isConnected.value) {
        connect()
      }
    }, 3000)
  }

  ws.value.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  ws.value.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ServerMessage
      debugLog.value.push({ direction: 'received', timestamp: Date.now(), data })
      handleServerMessage(data)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }
}

function disconnect() {
  ws.value?.close()
  ws.value = null
  isConnected.value = false
}

function send(message: ClientMessage) {
  if (ws.value?.readyState === WebSocket.OPEN) {
    debugLog.value.push({ direction: 'sent', timestamp: Date.now(), data: message })
    ws.value.send(JSON.stringify(message))
  }
}

// ============================================================================
// Server Message Handling
// ============================================================================

/**
 * Add text content to an existing assistant message or create a new one.
 * Used for both streaming (text_delta) and non-streaming (text) responses.
 */
function addOrAppendAssistantMessage(content: string) {
  const lastMessage = conversation.value[conversation.value.length - 1]
  if (lastMessage?.role === 'assistant' && !lastMessage.toolCalls?.length) {
    lastMessage.content += content
  } else {
    conversation.value.push({
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: Date.now(),
    })
  }
}

function handleServerMessage(data: ServerMessage) {
  switch (data.type) {
    case 'thinking':
      // Could show a thinking indicator
      break

    case 'text':
      // Add complete text block (non-streaming fallback)
      addOrAppendAssistantMessage(data.content)
      break

    case 'text_delta':
      // Stream text chunks as they arrive
      addOrAppendAssistantMessage(data.content)
      break

    case 'tool_call':
      handleToolCall(data.callId, data.tool, data.params)
      break

    case 'done':
      isProcessing.value = false
      if (data.message && !conversation.value.some(m => m.content === data.message)) {
        // Only add if not already present
        const lastMsg = conversation.value[conversation.value.length - 1]
        if (lastMsg?.role !== 'assistant' || lastMsg.content !== data.message) {
          conversation.value.push({
            id: generateMessageId(),
            role: 'assistant',
            content: data.message,
            timestamp: Date.now(),
          })
        }
      }
      break

    case 'error':
      isProcessing.value = false
      conversation.value.push({
        id: generateMessageId(),
        role: 'assistant',
        content: `Error: ${data.message}`,
        timestamp: Date.now(),
      })
      break
  }
}

// ============================================================================
// Tool Call Handling
// ============================================================================

async function handleToolCall(
  callId: string,
  tool: string,
  params: Record<string, unknown>,
) {
  // Find or create assistant message to attach this tool call to
  let assistantMessage = conversation.value[conversation.value.length - 1]
  if (assistantMessage?.role !== 'assistant') {
    assistantMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
    }
    conversation.value.push(assistantMessage)
  }

  // Ensure toolCalls array exists
  if (!assistantMessage.toolCalls) {
    assistantMessage.toolCalls = []
  }

  // Add tool call to the message (for display in conversation)
  const messageToolCall: { id: string; tool: string; status: 'pending' | 'success' | 'error' } = {
    id: callId,
    tool,
    status: 'pending',
  }
  assistantMessage.toolCalls.push(messageToolCall)

  // Track in activeToolCalls for detailed status (params, result, etc.)
  const toolCall: ActiveToolCall = {
    id: callId,
    tool,
    params,
    status: 'executing',
  }
  activeToolCalls.value.push(toolCall)

  // Update message tool call to executing
  messageToolCall.status = 'pending'

  try {
    const result = await executeToolLocally(tool, params)
    toolCall.status = 'success'
    toolCall.result = result
    messageToolCall.status = 'success'

    // Send result back to server
    send({
      type: 'tool_result',
      callId,
      result,
    })
  } catch (error) {
    toolCall.status = 'error'
    toolCall.error = (error as Error).message
    messageToolCall.status = 'error'

    // Send error back to server
    send({
      type: 'tool_result',
      callId,
      result: null,
      error: (error as Error).message,
    })
  }
}

async function executeToolLocally(
  tool: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (tool) {
    case 'get_block_info':
      return getBlockInfo(params.uuid as string)

    case 'get_editable_fields':
      return getEditableFields(
        params.uuid as string,
        params.includeNested as boolean | undefined,
      )

    case 'get_children':
      return getChildren(params.uuid as string, params.fieldName as string)

    case 'get_block_fields':
      return getBlockFields(params.uuid as string)

    case 'get_page_structure':
      return getPageStructure()

    case 'get_visible_blocks':
      return getVisibleBlocks()

    case 'get_available_bundles':
      return getAvailableBundles(
        params.hostUuid as string,
        params.fieldName as string,
      )

    case 'rewrite_text':
      return applyRewriteText(
        params.uuid as string,
        params.fieldName as string,
        params.value as string,
      )

    case 'add_block':
      return applyAddBlock(
        params.tempId as string,
        params.bundle as string,
        params.hostEntityType as string,
        params.hostUuid as string,
        params.hostFieldName as string,
        params.afterUuid as string | null,
        params.fields as Record<string, string>,
      )

    case 'delete_block':
      return applyDeleteBlock(params.uuid as string)

    case 'move_block':
      return applyMoveBlock(
        params.uuid as string,
        params.hostEntityType as string,
        params.hostUuid as string,
        params.hostFieldName as string,
        params.afterUuid as string | null,
      )

    default:
      throw new Error(`Unknown tool: ${tool}`)
  }
}

// ============================================================================
// Query Tool Implementations
// ============================================================================

function getBlockInfo(uuid: string): BlockInfoResult {
  const block = blocks.getBlock(uuid)
  if (!block) {
    throw new Error(`Block not found: ${uuid}`)
  }

  const item = state.getFieldListItem(uuid)
  const fieldList = state.getFieldListForBlock(uuid)

  // Determine the parent entity type - if parent is the page, use page entity type, otherwise it's a block
  const parentEntityType = fieldList
    ? fieldList.entityUuid === context.value.entityUuid
      ? context.value.entityType
      : itemEntityType
    : null

  return {
    uuid,
    bundle: block.bundle,
    options: item?.options ?? {},
    parentEntityType,
    parentUuid: fieldList?.entityUuid ?? null,
    parentFieldName: fieldList?.name ?? null,
  }
}

function getEditableFields(
  uuid: string,
  includeNested?: boolean,
): EditableFieldResult[] {
  const results: EditableFieldResult[] = []

  function processBlock(blockUuid: string) {
    const block = blocks.getBlock(blockUuid)
    if (!block) return

    const editables = directive.getEditablesForBlock(blockUuid)
    for (const editable of editables) {
      const fieldType = getFieldType(blockUuid, editable.fieldName)
      if (!fieldType) continue

      let currentValue = ''
      if (editable.getValue) {
        currentValue = editable.getValue()
      } else {
        const element = directive.findEditableElement(editable.fieldName, {
          type: itemEntityType,
          uuid: blockUuid,
          bundle: block.bundle,
        })
        if (element) {
          currentValue = fieldType === 'markup'
            ? element.innerHTML || ''
            : element.textContent || ''
        }
      }

      results.push({
        uuid: blockUuid,
        bundle: block.bundle,
        fieldName: editable.fieldName,
        fieldType,
        currentValue,
      })
    }

    // Process nested children if requested
    if (includeNested) {
      const mutatedFields = state.mutatedFields.value
      for (const field of mutatedFields) {
        if (field.entityUuid === blockUuid) {
          for (const child of field.list) {
            processBlock(child.uuid)
          }
        }
      }
    }
  }

  processBlock(uuid)
  return results
}

function getFieldType(uuid: string, fieldName: string): 'plain' | 'markup' | null {
  const block = blocks.getBlock(uuid)
  if (!block) return null

  const config = types.editableFieldConfig.forName(
    itemEntityType,
    block.bundle,
    fieldName,
  )
  if (!config) return null
  if (config.type === 'table') return null
  if (config.type === 'frame' || config.type === 'markup') return 'markup'
  return 'plain'
}

function getChildren(uuid: string, fieldName: string): ChildBlockResult[] {
  const field = state.getMutatedField(uuid, fieldName)
  if (!field) return []

  return field.list.map((item, index) => ({
    uuid: item.uuid,
    bundle: item.bundle,
    index,
  }))
}

function getBlockFields(uuid: string): BlockFieldResult[] {
  const block = blocks.getBlock(uuid)
  if (!block) return []

  const results: BlockFieldResult[] = []
  const mutatedFields = state.mutatedFields.value

  // Find all fields that have this block as their entity
  for (const field of mutatedFields) {
    if (field.entityUuid === uuid) {
      // Get the field config to find allowed bundles
      const fieldConfig = types.getFieldConfig(itemEntityType, block.bundle, field.name)
      results.push({
        name: field.name,
        allowedBundles: fieldConfig?.allowedBundles ?? [],
        currentCount: field.list.length,
      })
    }
  }

  return results
}

function getPageStructure(): PageStructureResult {
  const entityUuid = context.value.entityUuid
  const entityType = context.value.entityType
  const entityBundle = context.value.entityBundle

  function buildFieldStructure(hostUuid: string): PageStructureResult['fields'] {
    const fields: PageStructureResult['fields'] = []
    const mutatedFields = state.mutatedFields.value

    for (const field of mutatedFields) {
      if (field.entityUuid === hostUuid) {
        fields.push({
          name: field.name,
          blocks: field.list.map((item) => ({
            uuid: item.uuid,
            bundle: item.bundle,
            children: buildFieldStructure(item.uuid),
          })),
        })
      }
    }

    return fields
  }

  return {
    entityUuid,
    entityType,
    entityBundle,
    fields: buildFieldStructure(entityUuid),
  }
}

function getVisibleBlocks(): VisibleBlocksResult {
  const visibleUuids = dom.getVisibleBlocks()
  const viewport = ui.visibleViewport.value

  // Helper to calculate visibility percentage
  function calculateVisibility(uuid: string): number {
    const artboardRect = dom.getBlockRect(uuid)
    if (!artboardRect) return 0

    // Convert artboard-relative rect to viewport-relative
    const rect = ui.getViewportRelativeRect(artboardRect)

    // Calculate intersection of block rect with viewport
    const intersectX = Math.max(0, Math.min(rect.x + rect.width, viewport.x + viewport.width) - Math.max(rect.x, viewport.x))
    const intersectY = Math.max(0, Math.min(rect.y + rect.height, viewport.y + viewport.height) - Math.max(rect.y, viewport.y))
    const intersectArea = intersectX * intersectY
    const blockArea = rect.width * rect.height

    if (blockArea === 0) return 0
    return Math.round((intersectArea / blockArea) * 100)
  }

  // Helper to build tree for a block
  function buildBlockTree(uuid: string): VisibleBlock {
    const block = blocks.getBlock(uuid)
    const result: VisibleBlock = {
      uuid,
      bundle: block?.bundle ?? 'unknown',
      visibilityPercent: calculateVisibility(uuid),
    }

    // Find child fields for this block
    const mutatedFields = state.mutatedFields.value
    const childFields: Record<string, VisibleBlock[]> = {}

    for (const field of mutatedFields) {
      if (field.entityUuid === uuid && field.list.length > 0) {
        childFields[field.name] = field.list.map((item) => buildBlockTree(item.uuid))
      }
    }

    if (Object.keys(childFields).length > 0) {
      result.children = childFields
    }

    return result
  }

  // Filter to root blocks (nesting level = 0) and build trees
  const rootUuids = visibleUuids.filter((uuid) => state.getNestingLevel(uuid) === 0)
  const blockTrees = rootUuids.map((uuid) => buildBlockTree(uuid))

  // Sort by visibility (most visible first)
  blockTrees.sort((a, b) => b.visibilityPercent - a.visibilityPercent)

  return {
    blocks: blockTrees,
  }
}

function getAvailableBundles(
  hostUuid: string,
  fieldName: string,
): AvailableBundleResult[] {
  const field = fields.find(hostUuid, fieldName)
  if (!field) {
    return []
  }

  return field.allowedBundles.map((bundle) => {
    const bundleDefinition = types.getBlockBundleDefinition(bundle)
    const editableConfigs = types.editableFieldConfig.forEntityTypeAndBundle(itemEntityType, bundle)
    return {
      bundle,
      label: bundleDefinition?.label ?? bundle,
      editableFields: editableConfigs.map(c => c.name),
    }
  })
}

// ============================================================================
// Mutation Tool Implementations
// ============================================================================

function applyRewriteText(
  uuid: string,
  fieldName: string,
  value: string,
): { success: boolean } {
  // Store original value for revert
  if (!originalValues.value[uuid]) {
    originalValues.value[uuid] = {}
  }

  const block = blocks.getBlock(uuid)
  if (!block) {
    throw new Error(`Block not found: ${uuid}`)
  }

  const element = directive.findEditableElement(fieldName, {
    type: itemEntityType,
    uuid,
    bundle: block.bundle,
  })

  if (!originalValues.value[uuid]![fieldName]) {
    const fieldType = getFieldType(uuid, fieldName)
    if (element) {
      originalValues.value[uuid]![fieldName] = fieldType === 'markup'
        ? element.innerHTML || ''
        : element.textContent || ''
    }
  }

  // Apply the change visually
  if (element) {
    const fieldType = getFieldType(uuid, fieldName)
    if (fieldType === 'markup') {
      element.innerHTML = value
    } else {
      element.textContent = value
    }
  }

  // Track pending change
  pendingChanges.value.push({
    type: 'rewrite',
    uuid,
    fieldName,
    originalValue: originalValues.value[uuid]![fieldName] ?? '',
    newValue: value,
  })

  return { success: true }
}

function applyAddBlock(
  tempId: string,
  bundle: string,
  hostEntityType: string,
  hostUuid: string,
  hostFieldName: string,
  afterUuid: string | null,
  fields: Record<string, string>,
): { success: boolean } {
  // Generate a real UUID that will be used for both preview and final creation
  const blockUuid = generateUUID()

  // Store mapping so child blocks can reference this block
  tempIdToUuid[tempId] = blockUuid

  // Resolve hostUuid/afterUuid if they reference a previously added block's tempId
  const resolvedHostUuid = tempIdToUuid[hostUuid] ?? hostUuid
  const resolvedAfterUuid = afterUuid ? tempIdToUuid[afterUuid] ?? afterUuid : null

  // Add phantom block for preview using the same UUID
  state.addPhantomBlock(blockUuid, {
    bundle,
    host: { uuid: resolvedHostUuid, fieldName: hostFieldName },
    afterUuid: resolvedAfterUuid,
    props: fields,
  })

  // Track pending change - store resolved UUIDs so onAccept doesn't need to resolve again
  pendingChanges.value.push({
    type: 'add',
    blockUuid,
    bundle,
    hostEntityType,
    hostUuid: resolvedHostUuid,
    hostFieldName,
    afterUuid: resolvedAfterUuid,
    fields,
  })

  return { success: true }
}

function applyDeleteBlock(uuid: string): { success: boolean } {
  // For now, we just track the deletion - actual visual hiding would require more work
  pendingChanges.value.push({
    type: 'delete',
    uuid,
  })

  return { success: true }
}

function applyMoveBlock(
  uuid: string,
  hostEntityType: string,
  hostUuid: string,
  hostFieldName: string,
  afterUuid: string | null,
): { success: boolean } {
  const fieldList = state.getFieldListForBlock(uuid)

  // Determine the original host entity type
  const originalHostEntityType = fieldList
    ? fieldList.entityUuid === context.value.entityUuid
      ? context.value.entityType
      : itemEntityType
    : ''

  // Track pending change
  pendingChanges.value.push({
    type: 'move',
    uuid,
    originalHostEntityType,
    originalHostUuid: fieldList?.entityUuid ?? '',
    originalHostFieldName: fieldList?.name ?? '',
    originalAfterUuid: null, // Would need to calculate this
    newHostEntityType: hostEntityType,
    newHostUuid: hostUuid,
    newHostFieldName: hostFieldName,
    newAfterUuid: afterUuid,
  })

  return { success: true }
}

// ============================================================================
// User Actions
// ============================================================================

function onSendPrompt(prompt: string) {
  if (!prompt.trim() || isProcessing.value) return

  isProcessing.value = true
  activeToolCalls.value = []

  // Add user message to conversation
  conversation.value.push({
    id: generateMessageId(),
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
  })

  // Send to server with selected blocks
  send({
    type: 'start',
    prompt,
    selectedUuids: selection.uuids.value.length ? [...selection.uuids.value] : undefined,
  })
}

async function onAccept() {
  if (!pendingChanges.value.length) return

  // Clear phantom blocks before applying real mutations
  state.clearPhantomBlocks()

  // Apply each pending change using the appropriate adapter method
  // All UUIDs are already resolved in the applyXxx functions, so we can use them directly
  for (const change of pendingChanges.value) {
    switch (change.type) {
      case 'rewrite':
        await state.mutateWithLoadingState(() =>
          adapter.updateFieldValue({
            uuid: change.uuid,
            fieldName: change.fieldName,
            fieldValue: change.newValue,
          }),
        )
        break

      case 'add':
        // All UUIDs (blockUuid, hostUuid, afterUuid) were already resolved in applyAddBlock
        await state.mutateWithLoadingState(() =>
          adapter.addNewBlock({
            bundle: change.bundle,
            host: {
              type: change.hostEntityType,
              uuid: change.hostUuid,
              fieldName: change.hostFieldName,
            },
            afterUuid: change.afterUuid,
            blockUuid: change.blockUuid,
          }),
        )
        break

      case 'delete':
        await state.mutateWithLoadingState(
          () => adapter.deleteBlocks([change.uuid]),
          $t('deleteError', 'The block could not be deleted.'),
        )
        break

      case 'move':
        await state.mutateWithLoadingState(() =>
          adapter.moveMultipleBlocks({
            uuids: [change.uuid],
            host: {
              type: change.newHostEntityType,
              uuid: change.newHostUuid,
              fieldName: change.newHostFieldName,
            },
            afterUuid: change.newAfterUuid,
          }),
        )
        break
    }
  }

  // Send accept with tempId → UUID mappings so Claude knows the real UUIDs
  const createdBlocks = { ...tempIdToUuid }

  // Clear pending state
  pendingChanges.value = []
  originalValues.value = {}
  activeToolCalls.value = []
  // Clear tempId → UUID mapping
  for (const key in tempIdToUuid) {
    delete tempIdToUuid[key]
  }

  // Notify server that changes were accepted with UUID mappings
  send({ type: 'accept', createdBlocks })
}

function onReject() {
  // Revert all changes
  for (const [uuid, fields] of Object.entries(originalValues.value)) {
    const block = blocks.getBlock(uuid)
    if (!block) continue

    for (const [fieldName, originalValue] of Object.entries(fields)) {
      const element = directive.findEditableElement(fieldName, {
        type: itemEntityType,
        uuid,
        bundle: block.bundle,
      })
      if (element) {
        const fieldType = getFieldType(uuid, fieldName)
        if (fieldType === 'markup') {
          element.innerHTML = originalValue
        } else {
          element.textContent = originalValue
        }
      }
    }
  }

  // Clear phantom blocks
  state.clearPhantomBlocks()

  // Clear pending state but keep conversation history
  pendingChanges.value = []
  originalValues.value = {}
  activeToolCalls.value = []
  // Clear tempId → UUID mapping
  for (const key in tempIdToUuid) {
    delete tempIdToUuid[key]
  }

  // Notify server
  send({ type: 'reject' })
}

function onCancel() {
  send({ type: 'cancel' })
  isProcessing.value = false
}

function onDebug() {
  console.log(JSON.stringify(debugLog.value, null, 2))
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  connect()
})

onBeforeUnmount(() => {
  // Clean up phantom blocks
  state.clearPhantomBlocks()
  disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'Agent',
}
</script>
