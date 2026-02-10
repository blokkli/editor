<template>
  <div class="bk-agent-welcome">
    <div class="bk-agent-message-text" v-html="welcomeHtml" />
    <div v-if="defaultPrompts.length" class="bk-agent-welcome-prompts">
      <button
        v-for="(prompt, index) in defaultPrompts"
        :key="index"
        type="button"
        @click.prevent="emit('prompt', prompt)"
      >
        <Icon name="bk_mdi_chat" />
        <span>{{ prompt }}</span>
      </button>
    </div>
    <div class="bk-agent-welcome-disclaimer">
      <div v-html="disclaimer" />
      <Icon name="bk_mdi_priority_high" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { marked } from 'marked'
import welcomeMdEn from './en.md?raw'
import welcomeMdDe from './de.md?raw'
import { defaultPrompts } from '#blokkli-build/agent-client'
import { Icon } from '#blokkli/editor/components'

const props = defineProps<{
  agentName: string
}>()

const emit = defineEmits<{
  (e: 'prompt', value: string): void
}>()

const { $t, ui } = useBlokkli()

const welcomeMd =
  ui.interfaceLanguage.value === 'de' ? welcomeMdDe : welcomeMdEn

const welcomeHtml = await Promise.resolve(marked.parse(welcomeMd)).then((v) =>
  v.replaceAll('@agent-name', props.agentName),
)

const disclaimer = computed(() => {
  return $t(
    'aiAgentWelcomeDisclaimer',
    `@agent can make mistakes! Always check the output. <strong>Do not enter sensitive information.</strong>`,
  ).replace('@agent', props.agentName)
})
</script>
