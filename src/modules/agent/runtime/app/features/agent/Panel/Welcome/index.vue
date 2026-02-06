<template>
  <div class="bk-agent-welcome">
    <div class="bk-agent-message-text" v-html="welcomeHtml" />
    <div v-if="defaultPrompts.length" class="bk-agent-welcome-prompts">
      <button
        v-for="(prompt, index) in defaultPrompts"
        type="button"
        :key="index"
        @click.prevent="emit('prompt', prompt)"
      >
        <Icon name="bk_mdi_chat" />
        <span>{{ prompt }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { marked } from 'marked'
import welcomeMd from './en.md?raw'
import { defaultPrompts } from '#blokkli-build/agent-client'
import { Icon } from '#blokkli/editor/components'

const props = defineProps<{
  agentName: string
}>()

const emit = defineEmits<{
  (e: 'prompt', value: string): void
}>()

const welcomeHtml = await Promise.resolve(marked.parse(welcomeMd)).then((v) =>
  v.replaceAll('@agent-name', props.agentName),
)
</script>
