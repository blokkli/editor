<template>
  <div class="select-text">
    <PanelSection title="System Prompts">
      <template #post-title>
        <Pill :text="transcript.system.length" />
      </template>
      <PanelDetails
        v-for="prompt in transcript.system"
        :key="prompt.id"
        :title="prompt.id"
        :description="prompt.name"
      >
        <pre class="font-mono text-sm whitespace-pre-wrap">{{
          prompt.content
        }}</pre>
      </PanelDetails>
    </PanelSection>

    <PanelSection title="Tools">
      <template #post-title>
        <Pill :text="transcript.tools.length" />
      </template>
      <template v-if="transcript.tools.length">
        <PanelDetails
          v-for="tool in transcript.tools"
          :key="tool.name"
          :title="tool.name"
          :description="tool.description"
        >
          <pre class="bk-agent-transcript-block">{{
            JSON.stringify(tool.input_schema, null, 2)
          }}</pre>
        </PanelDetails>
      </template>
      <div v-else class="p-panel-gap">No tools loaded.</div>
    </PanelSection>

    <PanelSection title="Messages">
      <template #post-title>
        <Pill :text="transcript.messages.length" />
      </template>
      <div>
        <div
          v-for="(message, i) in transcript.messages"
          :key="i"
          class="p-panel-gap border-b border-b-mono-300 last:border-b-0"
        >
          <div
            class="flex items-center gap-5 text-accent-700 font-bold text-xs uppercase tracking-wider mb-10"
          >
            {{ message.type === 'agent' ? 'AGENT' : 'USER' }}
            <span
              v-if="message.full"
              class="font-normal lowercase text-yellow-dark"
              >(pruned)</span
            >
          </div>
          <MessageContent :content="message.seen" />
          <PanelDetails v-if="message.full" title="Original (before pruning)">
            <MessageContent :content="message.full" />
          </PanelDetails>
        </div>
      </div>
    </PanelSection>

    <PanelSection v-if="transcript.lastRequest" title="Last Request" padded>
      <pre class="bk-agent-transcript-block">{{
        JSON.stringify(transcript.lastRequest, null, 2)
      }}</pre>
      <template #actions>
        <PanelAction
          :title="copied ? 'Copied!' : 'Copy JSON'"
          icon="bk_mdi_content_copy"
          @click="copyLastRequest"
        />
      </template>
    </PanelSection>
  </div>
</template>

<script lang="ts" setup>
import { ref, onBeforeUnmount } from '#imports'
import type { Transcript } from '#blokkli/agent/shared/types'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelDetails from '#blokkli/editor/components/Panel/Details/index.vue'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import MessageContent from './MessageContent.vue'
import { Pill } from '#blokkli/editor/components'

const props = defineProps<{ transcript: Transcript }>()

const copied = ref(false)
let copiedTimeout: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  if (copiedTimeout) {
    clearTimeout(copiedTimeout)
  }
})

function copyLastRequest() {
  const json = JSON.stringify(props.transcript.lastRequest, null, 2)
  navigator.clipboard.writeText(json).then(() => {
    copied.value = true
    if (copiedTimeout) {
      clearTimeout(copiedTimeout)
    }
    copiedTimeout = setTimeout(() => {
      copied.value = false
      copiedTimeout = null
    }, 2000)
  })
}
</script>

<script lang="ts">
export default {
  name: 'AgentTranscript',
}
</script>

<style lang="postcss">
.bk-agent-transcript-block {
  @apply bg-mono-100 rounded p-10 m-0 whitespace-pre-wrap break-words text-xs font-mono text-mono-900;
}
</style>
