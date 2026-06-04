<template>
  <div class="flex flex-col gap-5">
    <template v-if="typeof content === 'string'">
      <pre class="bk-agent-transcript-block">{{ content }}</pre>
    </template>
    <template v-else>
      <div v-for="(block, j) in content" :key="j" class="flex flex-col gap-3">
        <template v-if="block.type === 'text'">
          <pre class="bk-agent-transcript-block">{{ block.text }}</pre>
        </template>
        <template v-else-if="block.type === 'skill'">
          <div class="text-teal-dark text-xs font-sans">
            Skill: {{ block.name }}
          </div>
          <pre class="bk-agent-transcript-block">{{ block.text }}</pre>
        </template>
        <template v-else-if="block.type === 'tool_use'">
          <div class="text-teal-dark text-xs font-sans">
            Tool Use: {{ block.name }} ({{ block.id }})
          </div>
          <pre class="bk-agent-transcript-block">{{
            JSON.stringify(block.input, null, 2)
          }}</pre>
        </template>
        <template v-else-if="block.type === 'tool_result'">
          <div class="text-teal-dark text-xs font-sans">
            Tool Result ({{ block.tool_use_id }})
            <span v-if="block.is_error" class="text-red-dark ml-5">ERROR</span>
          </div>
          <pre class="bk-agent-transcript-block">{{
            formatMaybeJson(block.content)
          }}</pre>
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { GenericContentBlock } from '#blokkli/agent/shared/types'

defineProps<{
  content: string | GenericContentBlock[]
}>()

function formatMaybeJson(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return value
  const first = trimmed[0]
  if (first !== '{' && first !== '[') return value
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return value
  }
}
</script>
