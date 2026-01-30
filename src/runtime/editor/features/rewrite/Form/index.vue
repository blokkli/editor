<template>
  <ArtboardTooltip
    id="rewrite"
    :title="title"
    class="bk-rewrite-form"
    close-icon="bk_mdi_check"
    placement-y="center"
    placement-x="right"
    @close="onAccept"
  >
    <ScrollBoundary class="bk-rewrite-form-inner">
      <div
        v-if="messages.length || resultItems.length || pendingToolCalls.length"
        class="bk-rewrite-history"
      >
        <Messages :messages="messages" />
        <Results
          v-if="!isStreaming && resultItems.length"
          :items="resultItems"
          @toggle="toggleField"
        />
        <ToolCalls
          v-if="!isStreaming && pendingToolCalls.length"
          :items="pendingToolCalls"
          @toggle="toggleToolCall"
        />
      </div>

      <div v-if="hasError" class="bk-rewrite-error">
        <Icon name="bk_mdi_error" />
        <span>{{ $t('rewriteError', 'An error occurred.') }}</span>
      </div>

      <div class="bk-rewrite-input">
        <FlexTextarea
          ref="textarea"
          v-model="prompt"
          :max-height="250"
          submit-on-enter
          rows="2"
          :placeholder="inputPlaceholder"
          @submit="onGenerate"
        />
        <div class="bk-rewrite-input-bottom">
          <button
            class="bk-rewrite-submit"
            :disabled="!canGenerate"
            :class="{ 'bk-is-loading': isStreaming }"
            @click.prevent="onGenerate"
          >
            <Icon v-if="isStreaming" name="loader" />
            <Icon v-else name="bk_mdi_arrow_upward" />
          </button>
        </div>
      </div>
    </ScrollBoundary>

    <div class="bk-artboard-tooltip-info">
      <button :disabled="!hasChanged" @click.prevent="onDiscard">
        {{ $t('editableFieldDiscard', 'Discard') }}
      </button>
    </div>
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
  nextTick,
} from '#imports'
import {
  ArtboardTooltip,
  Icon,
  FlexTextarea,
  ScrollBoundary,
} from '#blokkli/editor/components'
import type {
  RewriteFieldInfo,
  RewriteChunk,
  RewriteMessage,
  RewriteAcceptedText,
  PendingToolCall,
  RewriteTool,
} from '../types'
import { itemEntityType } from '#blokkli-build/config'
import type { AdaptersProvider } from '#blokkli/editor/providers/adapters'
import Messages from './Messages.vue'
import Results, { type ResultItem } from './Results.vue'
import ToolCalls from './ToolCalls.vue'

const props = defineProps<{
  uuids: string[]
  adapters: AdaptersProvider
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { $t, ui, directive, eventBus, state, dom, types, blocks } = useBlokkli()

const prompt = ref('')
const textarea = useTemplateRef('textarea')
const isStreaming = ref(false)
const hasError = ref(false)
const abortController = ref<AbortController | null>(null)

// Store original values for revert
const originalValues = ref<Record<string, Record<string, string>>>({})
// Store accepted/finalized values (not shown in results table)
const acceptedValues = ref<Record<string, Record<string, string>>>({})
// Store current pending values (shown in results table)
const pendingValues = ref<Record<string, Record<string, string>>>({})
// Chat history
const messages = ref<RewriteMessage[]>([])
// Track rejected fields in pending - key: `${uuid}:${fieldName}`
const rejectedFields = ref<Set<string>>(new Set())
// Pending tool calls from AI
const pendingToolCalls = ref<PendingToolCall[]>([])
// Counter for generating unique phantom UUIDs
let phantomCounter = 0

function getFieldKey(uuid: string, fieldName: string): string {
  return `${uuid}:${fieldName}`
}

const hasPendingContent = computed(() => {
  return Object.keys(pendingValues.value).length > 0
})

const hasAcceptedContent = computed(() => {
  return Object.keys(acceptedValues.value).length > 0
})

const hasChanged = computed(
  () => hasPendingContent.value || hasAcceptedContent.value || hasToolCalls.value,
)

const canGenerate = computed(() => {
  const hasPrompt = prompt.value.trim().length > 0
  const notStreaming = !isStreaming.value

  // After rewrite: only enable if there are rejected fields/tool calls to regenerate
  if (hasPendingContent.value || hasToolCalls.value) {
    const hasRejected = rejectedFields.value.size > 0 || rejectedToolCallsCount.value > 0
    return hasPrompt && notStreaming && hasRejected
  }
  return hasPrompt && notStreaming
})

const inputPlaceholder = computed(() => {
  const hasRejected = rejectedFields.value.size > 0 || rejectedToolCallsCount.value > 0
  if ((hasPendingContent.value || hasToolCalls.value) && hasRejected) {
    return $t(
      'rewriteRefinePromptPlaceholder',
      'Enter instructions to refine unchecked results...',
    )
  }
  return $t('rewritePromptPlaceholder', 'e.g. "rewrite in simpler words"')
})

const resultItems = computed<ResultItem[]>(() => {
  const items: ResultItem[] = []
  for (const [uuid, fields] of Object.entries(pendingValues.value)) {
    for (const [fieldName, value] of Object.entries(fields)) {
      const key = getFieldKey(uuid, fieldName)
      const plainText = value.replace(/<[^>]*>/g, '').trim()
      const element = directive.findEditableElement(fieldName, {
        type: itemEntityType,
        uuid,
        bundle: '',
      })
      items.push({
        key,
        uuid,
        fieldName,
        displayText: plainText,
        accepted: !rejectedFields.value.has(key),
        element,
      })
    }
  }
  return items
})

function toggleField(key: string) {
  const [uuid, fieldName] = key.split(':')
  if (!uuid || !fieldName) return

  if (rejectedFields.value.has(key)) {
    rejectedFields.value.delete(key)
    const rewrittenValue = pendingValues.value[uuid]?.[fieldName]
    if (rewrittenValue !== undefined) {
      updateEditableField(uuid, fieldName, rewrittenValue)
    }
  } else {
    rejectedFields.value.add(key)
    const originalValue = originalValues.value[uuid]?.[fieldName]
    if (originalValue !== undefined) {
      updateEditableField(uuid, fieldName, originalValue)
    }
  }
  rejectedFields.value = new Set(rejectedFields.value)
}

function toggleToolCall(id: string) {
  const toolCall = pendingToolCalls.value.find((tc) => tc.id === id)
  if (!toolCall) return

  toolCall.accepted = !toolCall.accepted

  // Handle phantom block visibility for add_block
  if (toolCall.tool.name === 'add_block' && toolCall.phantomUuid) {
    if (toolCall.accepted) {
      // Re-add phantom block
      state.addPhantomBlock(toolCall.phantomUuid, {
        bundle: toolCall.tool.params.bundle,
        host: {
          uuid: toolCall.tool.params.hostUuid,
          fieldName: toolCall.tool.params.hostFieldName,
        },
        afterUuid: toolCall.tool.params.afterUuid,
        props: toolCall.tool.params.fields,
      })
    } else {
      // Remove phantom block
      state.removePhantomBlock(toolCall.phantomUuid)
    }
  }

  // Handle rewrite_text visibility
  if (toolCall.tool.name === 'rewrite_text') {
    const { uuid, fieldName, value } = toolCall.tool.params
    if (toolCall.accepted) {
      updateEditableField(uuid, fieldName, value)
    } else {
      const originalValue = originalValues.value[uuid]?.[fieldName]
      if (originalValue !== undefined) {
        updateEditableField(uuid, fieldName, originalValue)
      }
    }
  }

  // Trigger reactivity
  pendingToolCalls.value = [...pendingToolCalls.value]
}

function generatePhantomUuid(): string {
  return `phantom-${Date.now()}-${phantomCounter++}`
}

function handleToolCallChunk(chunk: RewriteChunk) {
  // Handle tool_call chunk
  if ('type' in chunk && chunk.type === 'tool_call') {
    const toolCall: PendingToolCall = {
      id: chunk.id,
      tool: chunk.tool,
      accepted: true,
    }

    // For add_block, create phantom block
    if (chunk.tool.name === 'add_block') {
      const phantomUuid = generatePhantomUuid()
      toolCall.phantomUuid = phantomUuid
      state.addPhantomBlock(phantomUuid, {
        bundle: chunk.tool.params.bundle,
        host: {
          uuid: chunk.tool.params.hostUuid,
          fieldName: chunk.tool.params.hostFieldName,
        },
        afterUuid: chunk.tool.params.afterUuid,
        props: chunk.tool.params.fields,
      })
    }

    // For rewrite_text, update the DOM
    if (chunk.tool.name === 'rewrite_text') {
      const { uuid, fieldName, value } = chunk.tool.params
      if (!pendingValues.value[uuid]) {
        pendingValues.value[uuid] = {}
      }
      pendingValues.value[uuid]![fieldName] = value
      updateEditableField(uuid, fieldName, value)
    }

    pendingToolCalls.value.push(toolCall)
    return
  }

  // Handle tool_call_delta chunk (streaming updates to tool params)
  if ('type' in chunk && chunk.type === 'tool_call_delta') {
    const toolCall = pendingToolCalls.value.find((tc) => tc.id === chunk.id)
    if (toolCall && toolCall.tool.name === 'add_block') {
      // Parse the delta and update fields
      try {
        const deltaFields = JSON.parse(chunk.delta) as Record<string, string>
        toolCall.tool.params.fields = {
          ...toolCall.tool.params.fields,
          ...deltaFields,
        }
        // Update phantom block props
        if (toolCall.phantomUuid) {
          state.updatePhantomBlockProps(toolCall.phantomUuid, deltaFields)
        }
      } catch {
        // Delta might be partial JSON, ignore
      }
    }
    return
  }
}

const hasToolCalls = computed(() => pendingToolCalls.value.length > 0)

const rejectedToolCallsCount = computed(() => {
  return pendingToolCalls.value.filter((tc) => !tc.accepted).length
})

const fieldCount = computed(() => {
  let count = 0
  for (const uuid of props.uuids) {
    count += directive.getEditablesForBlock(uuid).length
  }
  return count
})

const blockCount = computed(() => {
  return props.uuids.filter(
    (uuid) => directive.getEditablesForBlock(uuid).length > 0,
  ).length
})

const title = computed(() => {
  if (isStreaming.value) {
    return $t('rewriteTitle', 'Rewriting @count texts...').replace(
      '@count',
      String(fieldCount.value),
    )
  }
  if (hasPendingContent.value || hasAcceptedContent.value) {
    return $t('rewriteTitleDone', 'Rewrite complete')
  }
  return $t('rewriteTitlePrompt', 'Rewrite @count texts in @blockCount blocks')
    .replace('@count', String(fieldCount.value))
    .replace('@blockCount', String(blockCount.value))
})

function getStreamRewriteMethod() {
  if (props.adapters.adapter.streamRewrite) {
    return props.adapters.adapter.streamRewrite.bind(props.adapters.adapter)
  }
  for (const ext of props.adapters.extensions) {
    if (ext.methods.streamRewrite) {
      return ext.methods.streamRewrite
    }
  }
  return null
}

function getApplyRewriteMethod() {
  if (props.adapters.adapter.applyRewrite) {
    return props.adapters.adapter.applyRewrite.bind(props.adapters.adapter)
  }
  for (const ext of props.adapters.extensions) {
    if (ext.methods.applyRewrite) {
      return ext.methods.applyRewrite
    }
  }
  return null
}

function getFieldType(
  uuid: string,
  fieldName: string,
): 'plain' | 'markup' | null {
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

function isMarkupField(uuid: string, fieldName: string): boolean {
  return getFieldType(uuid, fieldName) === 'markup'
}

function getEditableFieldsInfo(
  onlyRejected = false,
  previousAttempts?: Record<string, Record<string, string>>,
): RewriteFieldInfo[] {
  const blocksData: Array<{
    uuid: string
    x: number
    y: number
    fields: Array<{ field: RewriteFieldInfo; x: number; y: number }>
  }> = []

  for (const uuid of props.uuids) {
    const editables = directive.getEditablesForBlock(uuid)
    if (!editables.length) continue

    const blockRect = dom.getBlockRect(uuid)
    const blockX = blockRect?.x || 0
    const blockY = blockRect?.y || 0
    const fields: Array<{ field: RewriteFieldInfo; x: number; y: number }> = []

    for (const editable of editables) {
      const fieldType = getFieldType(uuid, editable.fieldName)
      if (!fieldType) continue

      if (onlyRejected) {
        const key = getFieldKey(uuid, editable.fieldName)
        if (!rejectedFields.value.has(key)) continue
      }

      // For refinement, use original value as currentValue
      // The previousAttempt will contain what the LLM generated before
      let currentValue = originalValues.value[uuid]?.[editable.fieldName]

      if (currentValue === undefined) {
        // First time - get from DOM
        const element = directive.findEditableElement(editable.fieldName, {
          type: itemEntityType,
          uuid,
          bundle: '',
        })

        if (editable.getValue) {
          currentValue = editable.getValue()
        } else if (element) {
          currentValue =
            fieldType === 'markup'
              ? element.innerHTML || ''
              : element.textContent || ''
        } else {
          currentValue = ''
        }
      }

      // Get previous attempt if provided (for rejected fields during refinement)
      const previousAttempt = previousAttempts?.[uuid]?.[editable.fieldName]

      const element = directive.findEditableElement(editable.fieldName, {
        type: itemEntityType,
        uuid,
        bundle: '',
      })

      let x = 0
      let y = 0
      if (element) {
        const rect = ui.getAbsoluteElementRect(element)
        x = rect.x
        y = rect.y
      }

      const fieldInfo: RewriteFieldInfo = {
        uuid,
        fieldName: editable.fieldName,
        currentValue,
        type: fieldType,
      }

      if (previousAttempt) {
        fieldInfo.previousAttempt = previousAttempt
      }

      fields.push({
        field: fieldInfo,
        x,
        y,
      })
    }

    fields.sort((a, b) => (Math.abs(a.y - b.y) > 10 ? a.y - b.y : a.x - b.x))
    if (fields.length) {
      blocksData.push({ uuid, x: blockX, y: blockY, fields })
    }
  }

  blocksData.sort((a, b) => (Math.abs(a.y - b.y) > 10 ? a.y - b.y : a.x - b.x))
  return blocksData.flatMap((block) => block.fields.map((f) => f.field))
}

function getContextFields() {
  const contextFields: Array<{
    uuid: string
    fieldName: string
    originalValue: string
    acceptedValue: string
    type: 'plain' | 'markup'
  }> = []

  // Context comes from already accepted values
  for (const [uuid, fields] of Object.entries(acceptedValues.value)) {
    for (const [fieldName, acceptedValue] of Object.entries(fields)) {
      const originalValue = originalValues.value[uuid]?.[fieldName]
      if (originalValue === undefined) continue

      const fieldType = getFieldType(uuid, fieldName)
      if (!fieldType) continue

      contextFields.push({
        uuid,
        fieldName,
        originalValue,
        acceptedValue,
        type: fieldType,
      })
    }
  }
  return contextFields
}

function buildBlockContext() {
  const blockContextBlocks: Array<{
    uuid: string
    bundle: string
    fields: Record<string, string>
    host?: { uuid: string; fieldName: string }
    afterUuid?: string | null
  }> = []

  for (const uuid of props.uuids) {
    const block = blocks.getBlock(uuid)
    if (!block) continue

    const editables = directive.getEditablesForBlock(uuid)
    const fieldValues: Record<string, string> = {}

    for (const editable of editables) {
      const fieldType = getFieldType(uuid, editable.fieldName)
      if (!fieldType) continue

      const element = directive.findEditableElement(editable.fieldName, {
        type: itemEntityType,
        uuid,
        bundle: '',
      })

      if (editable.getValue) {
        fieldValues[editable.fieldName] = editable.getValue()
      } else if (element) {
        fieldValues[editable.fieldName] =
          fieldType === 'markup'
            ? element.innerHTML || ''
            : element.textContent || ''
      }
    }

    // Get host info from state
    const fieldList = state.getFieldListForBlock(uuid)
    const hostInfo = fieldList
      ? { uuid: fieldList.entityUuid, fieldName: fieldList.name }
      : undefined

    // Get preceding block
    let afterUuid: string | null = null
    if (fieldList) {
      const index = fieldList.list.findIndex((item) => item.uuid === uuid)
      if (index > 0) {
        afterUuid = fieldList.list[index - 1]!.uuid
      }
    }

    blockContextBlocks.push({
      uuid,
      bundle: block.bundle,
      fields: fieldValues,
      host: hostInfo,
      afterUuid,
    })
  }

  // Build available bundles - bundles that can be added without a form
  // For simplicity, we'll just use a hardcoded list for the mock
  // In a real implementation, this would come from the definitions provider
  const availableBundles = [
    { bundle: 'card', label: 'Card', fields: ['title', 'text'] },
    { bundle: 'text', label: 'Text', fields: ['text'] },
    { bundle: 'title', label: 'Title', fields: ['title', 'tagline', 'lead'] },
  ]

  return {
    blocks: blockContextBlocks,
    availableBundles,
  }
}

function captureEditableValues(): Record<string, Record<string, string>> {
  const values: Record<string, Record<string, string>> = {}

  for (const uuid of props.uuids) {
    const editables = directive.getEditablesForBlock(uuid)
    if (!editables.length) continue

    values[uuid] = {}
    for (const editable of editables) {
      const fieldType = getFieldType(uuid, editable.fieldName)
      if (!fieldType) continue

      const element = directive.findEditableElement(editable.fieldName, {
        type: itemEntityType,
        uuid,
        bundle: '',
      })

      if (editable.getValue) {
        values[uuid]![editable.fieldName] = editable.getValue()
      } else if (element) {
        values[uuid]![editable.fieldName] =
          fieldType === 'markup'
            ? element.innerHTML || ''
            : element.textContent || ''
      }
    }
  }
  return values
}

function updateEditableField(uuid: string, fieldName: string, value: string) {
  const element = directive.findEditableElement(fieldName, {
    type: itemEntityType,
    uuid,
    bundle: '',
  })

  if (element) {
    if (isMarkupField(uuid, fieldName)) {
      element.innerHTML = value
    } else {
      element.textContent = value
    }
  }

  eventBus.emit('editable:update', { name: fieldName, entityUuid: uuid, value })
}

function revertToOriginal() {
  for (const [uuid, fields] of Object.entries(originalValues.value)) {
    for (const [fieldName, value] of Object.entries(fields)) {
      updateEditableField(uuid, fieldName, value)
    }
  }
  acceptedValues.value = {}
  pendingValues.value = {}
  messages.value = []
  rejectedFields.value = new Set()
  // Clear tool calls and phantom blocks
  state.clearPhantomBlocks()
  pendingToolCalls.value = []
}

async function startRewrite(rewritePrompt: string) {
  const isRefinement = hasPendingContent.value && rejectedFields.value.size > 0

  // Capture previous attempts for rejected fields before clearing pendingValues
  let previousAttempts: Record<string, Record<string, string>> | undefined
  if (isRefinement) {
    previousAttempts = {}
    for (const key of rejectedFields.value) {
      const [uuid, fieldName] = key.split(':')
      if (!uuid || !fieldName) continue
      const previousValue = pendingValues.value[uuid]?.[fieldName]
      if (previousValue !== undefined) {
        if (!previousAttempts[uuid]) {
          previousAttempts[uuid] = {}
        }
        previousAttempts[uuid]![fieldName] = previousValue
      }
    }
  }

  const fields = getEditableFieldsInfo(isRefinement, previousAttempts)

  const streamRewrite = getStreamRewriteMethod()
  if (!streamRewrite) {
    hasError.value = true
    return
  }

  ui.setTransform('Rewrite')

  if (Object.keys(originalValues.value).length === 0) {
    originalValues.value = captureEditableValues()
  }

  // For refinement: move accepted fields to acceptedValues before regenerating
  if (isRefinement) {
    const acceptedTexts: RewriteAcceptedText[] = []
    for (const [uuid, fields] of Object.entries(pendingValues.value)) {
      for (const [fieldName, value] of Object.entries(fields)) {
        const key = getFieldKey(uuid, fieldName)
        if (!rejectedFields.value.has(key)) {
          // Move to accepted
          if (!acceptedValues.value[uuid]) {
            acceptedValues.value[uuid] = {}
          }
          acceptedValues.value[uuid]![fieldName] = value
          // Strip HTML and truncate for display
          const plainText = value.replace(/<[^>]*>/g, '').trim()
          acceptedTexts.push({ text: plainText })
        }
      }
    }

    // Add message about accepted texts
    if (acceptedTexts.length > 0) {
      const count = acceptedTexts.length
      messages.value.push({
        role: 'assistant',
        content:
          count === 1
            ? $t('rewriteAcceptedMessageSingular', 'Accepted 1 text:')
            : $t(
                'rewriteAcceptedMessagePlural',
                'Accepted @count texts:',
              ).replace('@count', String(count)),
        acceptedTexts,
      })
    }
  }

  messages.value.push({ role: 'user', content: rewritePrompt })
  prompt.value = ''

  // Use props.uuids for all selected blocks (not just those with editable fields)
  const uuids = props.uuids

  // Clear pending values - only regenerated fields will be added
  pendingValues.value = {}
  rejectedFields.value = new Set()

  isStreaming.value = true
  hasError.value = false
  abortController.value = new AbortController()
  let lastRectUpdate = 0

  const request: Parameters<typeof streamRewrite>[0] = {
    fields,
    prompt: rewritePrompt,
    blockContext: buildBlockContext(),
    useTools: true,
  }

  if (isRefinement) {
    request.history = [...messages.value]
    request.context = getContextFields()
  }

  const affectedFields: Array<{ uuid: string; fieldName: string }> = []

  try {
    const result = await streamRewrite(
      request,
      (chunk: RewriteChunk) => {
        // Handle new tool-based chunks
        if ('type' in chunk) {
          if (chunk.type === 'tool_call' || chunk.type === 'tool_call_delta') {
            handleToolCallChunk(chunk)
            return
          }
          // Handle text_update chunk (typed legacy format)
          if (chunk.type === 'text_update') {
            if (!pendingValues.value[chunk.uuid]) {
              pendingValues.value[chunk.uuid] = {}
            }
            pendingValues.value[chunk.uuid]![chunk.fieldName] = chunk.value

            if (
              !affectedFields.some(
                (f) => f.uuid === chunk.uuid && f.fieldName === chunk.fieldName,
              )
            ) {
              affectedFields.push({ uuid: chunk.uuid, fieldName: chunk.fieldName })
            }

            updateEditableField(chunk.uuid, chunk.fieldName, chunk.value)
            const now = Date.now()
            if (now - lastRectUpdate > 50) {
              for (const uuid of uuids) {
                dom.refreshBlockRect(uuid)
              }
              lastRectUpdate = now
            }
            return
          }
          // Ignore assistant_text chunks for now
          return
        }

        // Handle legacy format (no type field)
        if (!pendingValues.value[chunk.uuid]) {
          pendingValues.value[chunk.uuid] = {}
        }
        pendingValues.value[chunk.uuid]![chunk.fieldName] = chunk.value

        if (
          !affectedFields.some(
            (f) => f.uuid === chunk.uuid && f.fieldName === chunk.fieldName,
          )
        ) {
          affectedFields.push({ uuid: chunk.uuid, fieldName: chunk.fieldName })
        }

        updateEditableField(chunk.uuid, chunk.fieldName, chunk.value)
        const now = Date.now()
        if (now - lastRectUpdate > 50) {
          for (const uuid of uuids) {
            dom.refreshBlockRect(uuid)
          }
          lastRectUpdate = now
        }
      },
      abortController.value.signal,
    )

    if (!result.success) {
      hasError.value = true
      messages.value.pop()
      revertToOriginal()
    } else {
      // Build summary message
      const totalActions = affectedFields.length + pendingToolCalls.value.length
      let messageContent: string
      if (totalActions === 1) {
        if (pendingToolCalls.value.length === 1) {
          const tc = pendingToolCalls.value[0]!
          if (tc.tool.name === 'add_block') {
            messageContent = $t('rewriteAddedBlock', 'Added 1 block')
          } else {
            messageContent = $t('rewriteAssistantMessageSingular', 'Rewrote 1 text')
          }
        } else {
          messageContent = $t('rewriteAssistantMessageSingular', 'Rewrote 1 text')
        }
      } else {
        const parts: string[] = []
        if (affectedFields.length > 0) {
          parts.push(
            affectedFields.length === 1
              ? $t('rewriteAssistantMessageSingular', 'Rewrote 1 text')
              : $t('rewriteAssistantMessagePlural', 'Rewrote @count texts').replace(
                  '@count',
                  String(affectedFields.length),
                ),
          )
        }
        const addBlockCount = pendingToolCalls.value.filter(
          (tc) => tc.tool.name === 'add_block',
        ).length
        if (addBlockCount > 0) {
          parts.push(
            addBlockCount === 1
              ? $t('rewriteAddedBlock', 'Added 1 block')
              : $t('rewriteAddedBlocks', 'Added @count blocks').replace(
                  '@count',
                  String(addBlockCount),
                ),
          )
        }
        messageContent = parts.join(', ')
      }

      messages.value.push({
        role: 'assistant',
        content: messageContent,
      })
      rejectedFields.value = new Set()
    }
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      hasError.value = true
      messages.value.pop()
      revertToOriginal()
    }
  } finally {
    isStreaming.value = false
    abortController.value = null
    ui.setTransform()
  }
}

function onGenerate() {
  if (!canGenerate.value) return
  startRewrite(prompt.value)
}

function onDiscard() {
  if (abortController.value) {
    abortController.value.abort()
  }
  revertToOriginal()
  emit('close')
}

async function onAccept() {
  const hasAccepted = Object.keys(acceptedValues.value).length > 0
  const hasPending = Object.keys(pendingValues.value).length > 0
  const hasAcceptedToolCalls = pendingToolCalls.value.some((tc) => tc.accepted)

  if (!hasAccepted && !hasPending && !hasAcceptedToolCalls) {
    // Clean up phantom blocks
    state.clearPhantomBlocks()
    emit('close')
    return
  }

  const applyRewrite = getApplyRewriteMethod()
  if (!applyRewrite) {
    console.error('No applyRewrite method available')
    state.clearPhantomBlocks()
    emit('close')
    return
  }

  // Start with already accepted values
  const valuesToApply: Record<string, Record<string, string>> = {}
  for (const [uuid, fields] of Object.entries(acceptedValues.value)) {
    for (const [fieldName, value] of Object.entries(fields)) {
      if (!valuesToApply[uuid]) valuesToApply[uuid] = {}
      valuesToApply[uuid]![fieldName] = value
    }
  }

  // Add accepted pending values
  for (const [uuid, fields] of Object.entries(pendingValues.value)) {
    for (const [fieldName, value] of Object.entries(fields)) {
      const key = getFieldKey(uuid, fieldName)
      if (!rejectedFields.value.has(key)) {
        if (!valuesToApply[uuid]) valuesToApply[uuid] = {}
        valuesToApply[uuid]![fieldName] = value
      }
    }
  }

  // Restore originals for rejected pending fields
  for (const key of rejectedFields.value) {
    const [uuid, fieldName] = key.split(':')
    if (!uuid || !fieldName) continue
    const originalValue = originalValues.value[uuid]?.[fieldName]
    if (originalValue !== undefined) {
      updateEditableField(uuid, fieldName, originalValue)
    }
  }

  // Collect accepted tool calls
  const acceptedToolCalls: RewriteTool[] = pendingToolCalls.value
    .filter((tc) => tc.accepted)
    .map((tc) => tc.tool)

  // Remove rejected phantom blocks
  for (const tc of pendingToolCalls.value) {
    if (!tc.accepted && tc.phantomUuid) {
      state.removePhantomBlock(tc.phantomUuid)
    }
  }

  // Clear all phantom blocks before applying (they will be created as real blocks)
  state.clearPhantomBlocks()

  if (Object.keys(valuesToApply).length === 0 && acceptedToolCalls.length === 0) {
    emit('close')
    return
  }

  await state.mutateWithLoadingState(
    () => applyRewrite({ values: valuesToApply, toolCalls: acceptedToolCalls }),
    $t('rewriteApplyError', 'Failed to save rewritten content.'),
  )

  emit('close')
}

onMounted(() => {
  ui.setSelectionColor('rewrite', 'orange')
  nextTick(() => textarea.value?.focus())
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('rewrite')
  if (abortController.value) {
    abortController.value.abort()
  }
  // Clean up any phantom blocks
  state.clearPhantomBlocks()
})
</script>
