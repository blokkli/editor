import { ref, shallowRef, readonly, type Ref } from '#imports'
import type {
  McpToolDefinition,
  MutationAction,
  ToolOutcome,
} from '#blokkli/agent/app/types'
import type { PageContext } from '#blokkli/agent/shared/types'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import {
  createToolMap,
  executeTool,
  getToolCategory,
  getToolDefinition,
  getToolInfoForServer,
  isMutationAction,
  isQueryResult,
  isToolError,
  asRecord,
  splitMeta,
} from '#blokkli/agent/app/helpers'
import { buildNewParagraphsTree } from '#blokkli/agent/app/helpers/mutationResult'
import { mcpTools } from '#blokkli-build/agent-client'
import type { AgentToolName, AgentToolMap } from '#blokkli-build/agent-client'
import { itemEntityType } from '#blokkli-build/config'
import { generateId } from '#blokkli/agent/app/helpers/id'
import type { SocketProvider } from './socketProvider'
import type { ConversationProvider } from './conversationProvider'

export type PendingMutationState = {
  action: MutationAction
  resolve: (approved: boolean) => void
}

export type PendingToolCall = {
  toolName: string
  params: Record<string, unknown>
}

export type ToolsProvider = {
  pendingMutation: Ref<PendingMutationState | null>
  pendingToolCall: Ref<PendingToolCall | null>
  autoApprove: Ref<boolean>
  pageContext: Readonly<Ref<PageContext | null>>

  init: () => Promise<{ toolNames: string[] }>
  setPageContext: (ctx: PageContext) => void
  dispatch: (
    callId: string,
    tool: string,
    params: Record<string, unknown>,
  ) => Promise<void>
  runForPrompt: <T extends AgentToolName>(
    toolName: T,
    params: AgentToolMap[T]['params'],
  ) => Promise<{
    toolName: T
    params: AgentToolMap[T]['params']
    result: AgentToolMap[T]['result']
    label: string
  }>
  approve: () => void
  reject: () => void
  setAutoApprove: (value: boolean) => void
  onComponentDone: (result: unknown) => void
  cancelPending: () => void
}

export default function toolsProvider({
  app,
  adapter,
  socket,
  conversation,
}: {
  app: BlokkliApp
  adapter: FullBlokkliAdapter<any>
  socket: SocketProvider
  conversation: ConversationProvider
}): ToolsProvider {
  const { $t, state } = app

  const pendingMutation = ref<PendingMutationState | null>(null)
  const pendingToolCall = ref<PendingToolCall | null>(null)
  const autoApprove = ref(false)
  const pageContext = shallowRef<PageContext | null>(null)

  let toolMap: Record<string, McpToolDefinition> = {}
  let pendingToolCallResolve: ((result: unknown) => void) | null = null

  function createToolContext() {
    return {
      app,
      itemEntityType,
      adapter,
      pageContext: pageContext.value,
    }
  }

  async function init(): Promise<{ toolNames: string[] }> {
    toolMap = createToolMap(mcpTools)
    const toolNames = await getToolInfoForServer(
      mcpTools,
      state.editMode.value,
      app,
      adapter,
    )
    return { toolNames }
  }

  function setPageContext(ctx: PageContext): void {
    pageContext.value = ctx
  }

  function waitForToolComponent(
    toolName: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    return new Promise((resolve) => {
      pendingToolCall.value = { toolName, params }
      pendingToolCallResolve = resolve
    })
  }

  function waitForApproval(action: MutationAction): Promise<boolean> {
    return new Promise((resolve) => {
      pendingMutation.value = { action, resolve }
    })
  }

  type ToolContext = ReturnType<typeof createToolContext>

  /** Component-rendering tool: prepare params, await the component, split meta. */
  async function executeComponentTool(
    toolDef: McpToolDefinition,
    ctx: ToolContext,
    params: Record<string, unknown>,
    setLabel?: (label: string) => void,
  ): Promise<ToolOutcome> {
    const preparedParams = await executeTool(toolMap, toolDef.name, ctx, params)

    if (isToolError(preparedParams)) {
      return { ok: false, error: preparedParams.error }
    }

    const raw = await waitForToolComponent(
      toolDef.name,
      preparedParams as Record<string, unknown>,
    )
    const { payload, meta } = splitMeta(raw)

    const payloadObj = asRecord(payload)
    if (setLabel && payloadObj && typeof payloadObj.label === 'string') {
      setLabel(payloadObj.label)
    }

    return { ok: true, result: payload, meta }
  }

  /** Read-only query tool: surface the label and select/scroll any affected blocks. */
  function executeQueryTool(
    result: unknown,
    setLabel?: (label: string) => void,
  ): ToolOutcome {
    if (isQueryResult(result)) {
      if (setLabel) setLabel(result.label)
      if (result.affectedUuids?.length) {
        app.eventBus.emit('select', result.affectedUuids)
        app.eventBus.emit('scrollSelectionIntoView', {})
      }
      return { ok: true, result: result.result, meta: {} }
    }
    return { ok: true, result, meta: {} }
  }

  /** Mutation tool: apply (with optional approval), then build the result payload. */
  async function executeMutationTool(
    result: unknown,
    toolDef: McpToolDefinition,
    setLabel?: (label: string) => void,
  ): Promise<ToolOutcome> {
    if (!isMutationAction(result)) {
      return { ok: false, error: 'Invalid mutation tool result' }
    }

    const action = result
    if (setLabel) setLabel(action.label)

    async function applyMutation(): Promise<string[]> {
      const uuidsBefore = state.getAllUuids()
      await state.mutateWithLoadingState(() => action.apply(adapter))
      const newUuids = state
        .getAllUuids()
        .filter((uuid) => !uuidsBefore.includes(uuid))
      const selectUuids = newUuids.length
        ? newUuids
        : action.affectedUuids || []
      if (selectUuids.length) {
        app.eventBus.emit('select', selectUuids)
        app.eventBus.emit('scrollSelectionIntoView', {})
      }
      return newUuids
    }

    function buildMutationResult(newUuids: string[]) {
      const newParagraphs =
        action.type === 'add'
          ? buildNewParagraphsTree(newUuids, app, itemEntityType)
          : []

      return {
        success: true,
        historyIndex: state.currentMutationIndex.value,
        newParagraphs: newParagraphs.length ? newParagraphs : undefined,
        ...action.result,
      }
    }

    if (autoApprove.value || !toolDef.requiresApproval) {
      const newUuids = await applyMutation()
      return { ok: true, result: buildMutationResult(newUuids), meta: {} }
    }

    const approved = await waitForApproval(action)
    if (approved) {
      const newUuids = await applyMutation()
      return { ok: true, result: buildMutationResult(newUuids), meta: {} }
    }

    if (action.revert) action.revert()
    return { ok: true, result: { success: false, rejected: true }, meta: {} }
  }

  async function executeLocally(
    toolName: string,
    params: Record<string, unknown>,
    setLabel?: (label: string) => void,
  ): Promise<ToolOutcome> {
    const ctx = createToolContext()
    const toolDef = getToolDefinition(toolMap, toolName)

    if (toolDef.component) {
      return executeComponentTool(toolDef, ctx, params, setLabel)
    }

    const category = getToolCategory(toolMap, toolName)
    const result = await executeTool(toolMap, toolName, ctx, params)

    if (isToolError(result)) return { ok: false, error: result.error }

    if (category === 'query') {
      return executeQueryTool(result, setLabel)
    }

    return executeMutationTool(result, toolDef, setLabel)
  }

  async function dispatch(
    callId: string,
    tool: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    const toolDef = getToolDefinition(toolMap, tool)
    const initialLabel = toolDef.label($t)
    const toolId = generateId()
    const timestamp = Date.now()

    let currentLabel = initialLabel

    conversation.setActive({
      type: 'tool',
      id: toolId,
      callId,
      tool,
      label: initialLabel,
      status: 'active',
      timestamp,
    })

    function finishItem(status: 'success' | 'error') {
      conversation.pushTool({
        type: 'tool',
        id: toolId,
        callId,
        tool,
        label: currentLabel,
        status,
        timestamp,
      })
      conversation.setActive(null)
    }

    try {
      const outcome = await executeLocally(tool, params, (label) => {
        currentLabel = label
        const active = conversation.activeItem.value
        if (active?.type === 'tool' && active.callId === callId) {
          conversation.setActive({ ...active, label })
        }
      })

      if (!outcome.ok) {
        finishItem('error')
        socket.send({
          type: 'tool_result',
          callId,
          result: null,
          error: outcome.error,
        })
        return
      }

      finishItem('success')

      if (toolDef.buildDetails) {
        try {
          const detailsSource = outcome.meta.details ?? outcome.result
          const details = toolDef.buildDetails(detailsSource)
          if (details != null) {
            conversation.setToolDetail(callId, details)
          }
        } catch {
          // buildDetails is user code — its failures must not break dispatch.
        }
      }

      if (outcome.meta.usage) {
        conversation.pushUsage(outcome.meta.usage)
      }

      // The server reads `_summary` from the wire payload during pruning.
      let resultForServer = outcome.result
      const resultObj = asRecord(resultForServer)
      if (toolDef.prunedSummary && resultObj) {
        try {
          const summary = toolDef.prunedSummary(resultObj)
          if (summary) {
            resultForServer = { ...resultObj, _summary: summary }
          }
        } catch {
          // prunedSummary is user code — fall back to the raw payload.
        }
      }

      socket.send({
        type: 'tool_result',
        callId,
        result: resultForServer,
        skipLlmResponse: outcome.meta.skipLlmResponse,
      })
    } catch (error) {
      finishItem('error')
      socket.send({
        type: 'tool_result',
        callId,
        result: null,
        error: (error as Error).message,
      })
    }
  }

  async function runForPrompt<T extends AgentToolName>(
    toolName: T,
    params: AgentToolMap[T]['params'],
  ) {
    const ctx = createToolContext()

    // The tool map may not be populated yet if preExecute runs before the
    // WebSocket has connected.
    if (!Object.keys(toolMap).length) {
      toolMap = createToolMap(mcpTools)
    }

    const toolDef = getToolDefinition(toolMap, toolName)
    const rawResult = await executeTool(toolMap, toolName, ctx, params)
    const label = isQueryResult(rawResult) ? rawResult.label : toolDef.label($t)
    const result = isQueryResult(rawResult)
      ? (rawResult.result as AgentToolMap[T]['result'])
      : (rawResult as AgentToolMap[T]['result'])
    return { toolName, params, result, label }
  }

  function approve(): void {
    if (pendingMutation.value) {
      pendingMutation.value.resolve(true)
      pendingMutation.value = null
    }
  }

  function reject(): void {
    if (pendingMutation.value) {
      pendingMutation.value.resolve(false)
      pendingMutation.value = null
    }
  }

  function setAutoApprove(value: boolean): void {
    autoApprove.value = value
    if (value) approve()
  }

  function onComponentDone(result: unknown): void {
    if (pendingToolCallResolve) {
      pendingToolCallResolve(result)
      pendingToolCallResolve = null
    }
    pendingToolCall.value = null
  }

  function cancelPending(): void {
    if (pendingMutation.value) {
      if (pendingMutation.value.action.revert) {
        pendingMutation.value.action.revert()
      }
      pendingMutation.value.resolve(false)
      pendingMutation.value = null
    }
    if (pendingToolCallResolve) {
      pendingToolCallResolve({ cancelled: true })
      pendingToolCallResolve = null
    }
    pendingToolCall.value = null
  }

  return {
    pendingMutation,
    pendingToolCall,
    autoApprove,
    pageContext: readonly(pageContext) as Readonly<Ref<PageContext | null>>,

    init,
    setPageContext,
    dispatch,
    runForPrompt,
    approve,
    reject,
    setAutoApprove,
    onComponentDone,
    cancelPending,
  }
}
