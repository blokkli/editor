<template>
  <div class="bk-agent-transcript">
    <section class="bk-agent-transcript-section">
      <h3>System Prompts ({{ transcript.system.length }})</h3>
      <details
        v-for="prompt in transcript.system"
        :key="prompt.id"
        class="bk-agent-transcript-entry"
      >
        <summary>{{ prompt.name }}</summary>
        <pre class="bk-agent-transcript-block">{{ prompt.content }}</pre>
      </details>
    </section>

    <section class="bk-agent-transcript-section">
      <h3>Tools ({{ transcript.tools.length }})</h3>
      <details
        v-for="tool in transcript.tools"
        :key="tool.name"
        class="bk-agent-transcript-entry"
      >
        <summary>{{ tool.name }}</summary>
        <div class="bk-agent-transcript-block">
          <p>{{ tool.description }}</p>
          <pre>{{ JSON.stringify(tool.input_schema, null, 2) }}</pre>
        </div>
      </details>
    </section>

    <section class="bk-agent-transcript-section">
      <h3>Messages ({{ transcript.messages.length }})</h3>
      <div
        v-for="(message, i) in transcript.messages"
        :key="i"
        class="bk-agent-transcript-message"
      >
        <div class="bk-agent-transcript-role">
          {{ message.type === 'agent' ? 'AGENT' : 'USER' }}
          <span v-if="message.full" class="bk-agent-transcript-pruned"
            >(pruned)</span
          >
        </div>
        <div class="bk-agent-transcript-content">
          <template v-if="typeof message.seen === 'string'">
            <pre class="bk-agent-transcript-block">{{ message.seen }}</pre>
          </template>
          <template v-else>
            <div
              v-for="(block, j) in message.seen"
              :key="j"
              class="bk-agent-transcript-block"
            >
              <template v-if="block.type === 'text'">
                <pre>{{ block.text }}</pre>
              </template>
              <template v-else-if="block.type === 'skill'">
                <div class="bk-agent-transcript-label">
                  Skill: {{ block.name }}
                </div>
                <pre>{{ block.text }}</pre>
              </template>
              <template v-else-if="block.type === 'tool_use'">
                <div class="bk-agent-transcript-label">
                  Tool Use: {{ block.name }} ({{ block.id }})
                </div>
                <pre>{{ JSON.stringify(block.input, null, 2) }}</pre>
              </template>
              <template v-else-if="block.type === 'tool_result'">
                <div class="bk-agent-transcript-label">
                  Tool Result ({{ block.tool_use_id }})
                  <span v-if="block.is_error" class="bk-agent-transcript-error"
                    >ERROR</span
                  >
                </div>
                <pre>{{ block.content }}</pre>
              </template>
            </div>
          </template>
        </div>

        <details v-if="message.full" class="bk-agent-transcript-entry">
          <summary>Original (before pruning)</summary>
          <div class="bk-agent-transcript-content">
            <template v-if="typeof message.full === 'string'">
              <pre class="bk-agent-transcript-block">{{ message.full }}</pre>
            </template>
            <template v-else>
              <div
                v-for="(block, j) in message.full"
                :key="j"
                class="bk-agent-transcript-block"
              >
                <template v-if="block.type === 'text'">
                  <pre>{{ block.text }}</pre>
                </template>
                <template v-else-if="block.type === 'skill'">
                  <div class="bk-agent-transcript-label">
                    Skill: {{ block.name }}
                  </div>
                  <pre>{{ block.text }}</pre>
                </template>
                <template v-else-if="block.type === 'tool_use'">
                  <div class="bk-agent-transcript-label">
                    Tool Use: {{ block.name }} ({{ block.id }})
                  </div>
                  <pre>{{ JSON.stringify(block.input, null, 2) }}</pre>
                </template>
                <template v-else-if="block.type === 'tool_result'">
                  <div class="bk-agent-transcript-label">
                    Tool Result ({{ block.tool_use_id }})
                    <span
                      v-if="block.is_error"
                      class="bk-agent-transcript-error"
                      >ERROR</span
                    >
                  </div>
                  <pre>{{ block.content }}</pre>
                </template>
              </div>
            </template>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import type { Transcript } from '#blokkli/agent/shared/types'

defineProps<{ transcript: Transcript }>()
</script>

<script lang="ts">
export default {
  name: 'AgentTranscript',
}
</script>
