<template>
  <button
    type="button"
    class="bk-button bk-scheme-mono bk-is-small"
    data-test="run-agent-tool"
    @click.prevent="runDefaultTool"
  >
    Run get_all_page_content
  </button>

  <pre
    v-if="lastResult"
    data-test="agent-tool-last-result"
    class="text-xs bg-mono-100 p-10 rounded max-h-[400px] overflow-auto"
    >{{ lastResult }}</pre
  >
</template>

<script setup lang="ts">
import { ref, useBlokkli, onMounted } from '#imports'
import {
  createToolMap,
  executeTool,
  isMutationAction,
} from '#blokkli/agent/app/helpers/index'
import { buildNewParagraphsTree } from '#blokkli/agent/app/helpers/mutationResult'
import { mcpTools } from '#blokkli-build/agent-client'
import { itemEntityType } from '#blokkli-build/config'
import type { AgentToolMap, AgentToolName } from '#blokkli-build/agent-client'
import type { BlokkliTestApi } from '../../types'

/**
 * AgentTool test case: lets E2E specs invoke an agent client tool directly,
 * bypassing the LLM/WebSocket loop. Builds a minimal `McpToolContext`
 * (`{ app, itemEntityType, adapter, pageContext: null }`) and calls the same
 * `executeTool` helper the runtime `toolsProvider` uses, so what the test sees
 * matches what the agent would receive when calling the tool itself.
 *
 * Use for assertions about a tool's *return value* (what content/structure it
 * exposes to the LLM) rather than how it's framed in the conversation —
 * pruning, system prompts, and conversation projection aren't involved.
 *
 * Mutation tools are applied via `state.mutateWithLoadingState` (auto-approved
 * — no diff/approval UI), then the success envelope is built with the same
 * `buildNewParagraphsTree` helper the runtime `toolsProvider` uses, so a test
 * asserting the result shape pins the same code path that ships to the LLM.
 */
const emit = defineEmits<{
  register: [api: Partial<BlokkliTestApi>]
}>()

const blokkli = useBlokkli()
const toolMap = createToolMap(mcpTools)

const lastResult = ref<string | null>(null)

async function runAgentTool<T extends AgentToolName>(
  name: T,
  params: AgentToolMap[T]['params'],
): Promise<AgentToolMap[T]['result']> {
  const ctx = {
    app: blokkli,
    itemEntityType,
    adapter: blokkli.adapter,
    pageContext: null,
  }
  const raw = (await executeTool(
    toolMap,
    name,
    ctx,
    params as Record<string, unknown>,
  )) as unknown

  let result: AgentToolMap[T]['result']
  if (isMutationAction(raw)) {
    const action = raw
    const uuidsBefore = blokkli.state.getAllUuids()
    await blokkli.state.mutateWithLoadingState(() =>
      action.apply(blokkli.adapter),
    )
    const newUuids = blokkli.state
      .getAllUuids()
      .filter((uuid) => !uuidsBefore.includes(uuid))
    const newParagraphs =
      action.type === 'add'
        ? buildNewParagraphsTree(newUuids, blokkli, itemEntityType)
        : []
    result = {
      success: true,
      historyIndex: blokkli.state.currentMutationIndex.value,
      ...(newParagraphs.length ? { newParagraphs } : {}),
      ...action.result,
    } as unknown as AgentToolMap[T]['result']
  } else {
    // Query tools return `{ label, result, affectedUuids }`; unwrap to the
    // tool-defined result shape (the same thing the LLM would see in `content`).
    result =
      raw && typeof raw === 'object' && 'result' in raw
        ? (raw as { result: AgentToolMap[T]['result'] }).result
        : (raw as AgentToolMap[T]['result'])
  }

  lastResult.value = JSON.stringify(result, null, 2)
  return result
}

async function runDefaultTool() {
  await runAgentTool('get_all_page_content', {})
}

onMounted(() => {
  emit('register', { runAgentTool })
})

defineOptions({
  name: 'TestCaseAgentTool',
})
</script>
