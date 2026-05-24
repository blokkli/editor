<template>
  <AgentPanel :is-shown />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="conversation.showTranscript.value"
        id="agent-transcript"
        title="Agent Transcript"
        :width="1200"
        hide-buttons
        mono
        @cancel="conversation.showTranscript.value = false"
      >
        <AgentTranscript
          v-if="conversation.transcriptContent.value"
          :transcript="conversation.transcriptContent.value"
        />
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  onBeforeUnmount,
  onMounted,
  watch,
  provide,
  defineAsyncComponent,
} from '#imports'
import { DialogModal, BlokkliTransition } from '#blokkli/editor/components'
import socketProvider from '#blokkli/agent/app/providers/socketProvider'
import conversationProvider from '#blokkli/agent/app/providers/conversationProvider'
import planProvider from '#blokkli/agent/app/providers/planProvider'
import toolsProvider from '#blokkli/agent/app/providers/toolsProvider'
import agentProvider from '#blokkli/agent/app/providers/agentProvider'
import { INJECT_AGENT_APP } from '#blokkli/agent/app/helpers/injections'
import type { AgentApp } from '#blokkli/agent/app/types'
import AgentPanel from './Panel/index.vue'
import type { PendingPromptRequest } from './types'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import { agentName } from '#blokkli-build/agent-prompts'

const AgentTranscript = defineAsyncComponent(
  () => import('./Transcript/index.vue'),
)

const props = defineProps<{
  isShown: boolean
  adapter: FullBlokkliAdapter<any>
  pendingPromptRequest: PendingPromptRequest | null
}>()

const emit = defineEmits<{
  (e: 'consumed'): void
}>()

const blokkli = useBlokkli()
const { ui } = blokkli

const socket = socketProvider()
const conversation = conversationProvider({ adapter: props.adapter })
const plan = planProvider({ socket, conversation })
const tools = toolsProvider({
  app: blokkli,
  adapter: props.adapter,
  socket,
  conversation,
})
const agent = agentProvider({
  app: blokkli,
  adapter: props.adapter,
  agentName,
  socket,
  conversation,
  plan,
  tools,
})

const agentApp: AgentApp = {
  socket,
  conversation,
  plan,
  tools,
  ...agent,
}
provide(INJECT_AGENT_APP, agentApp)

// Run a prompt request queued by the outer feature component's item-dropdown
// callback (see `features/agent/index.vue`). The request is consumed (cleared
// in the parent) before the async `preExecute`/`sendPrompt` so it can't re-run.
async function consumePromptRequest(request: PendingPromptRequest) {
  emit('consumed')

  const { prompt, selectedUuids } = request
  const promptText = prompt.getPrompt(blokkli)
  const userPromptText = prompt.getUserPrompt?.(blokkli)

  let preSeededResults = undefined
  let autoExecuteTools = undefined

  if (prompt.preExecute) {
    const preResult = await prompt.preExecute({
      app: blokkli,
      selectedUuids,
      runTool: tools.runForPrompt,
    })
    if (preResult) {
      preSeededResults = preResult.preSeededResults
      autoExecuteTools = preResult.autoExecuteTools
    }
  }

  agent.sendPrompt({
    prompt: promptText,
    displayPrompt: userPromptText,
    selectedUuids,
    autoLoadTools: prompt.tools,
    autoLoadSkills: prompt.skills,
    preSeededResults,
    autoExecuteTools,
    promptId: prompt.id,
  })
}

// The request is commonly queued *before* this lazy container mounts (the user
// clicks a dropdown action which opens the sidebar for the first time), so
// drain any pending value on mount.
onMounted(() => {
  if (props.pendingPromptRequest) {
    consumePromptRequest(props.pendingPromptRequest)
  }
})

// Handle a request queued while the sidebar is already open. The initial value
// is owned by `onMounted` above, so this does not fire for it (no double-send).
watch(
  () => props.pendingPromptRequest,
  (request) => {
    if (request) consumePromptRequest(request)
  },
)

onBeforeUnmount(() => {
  agent.disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'AgentContainer',
}
</script>
