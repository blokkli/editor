<template>
  <div>
    <Markdown
      class="bk-agent-message-text bk-agent-welcome-text"
      :content="welcomeContent"
    />
    <div
      v-if="defaultPrompts.length || promptDefinitions.length"
      class="grid gap-5 mt-10"
    >
      <PromptButton
        v-for="(prompt, index) in defaultPrompts"
        :key="index"
        :label="prompt"
        icon="bk_mdi_chat"
        :disabled
        @click.prevent="emit('prompt', prompt)"
      />
      <PromptButton
        v-for="prompt in promptDefinitions"
        :key="prompt.id"
        :label="prompt.getLabel(app)"
        icon="stars"
        :disabled
        @click.prevent="emit('promptDefinition', prompt)"
      />
    </div>
    <InfoBox :text="disclaimer" class="mt-20" small />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import welcomeMdEn from './en.md?raw'
import welcomeMdDe from './de.md?raw'
import { defaultPrompts } from '#blokkli-build/agent-client'
import { InfoBox } from '#blokkli/editor/components'
import Markdown from '#blokkli/agent/app/components/Markdown/index.vue'
import PromptButton from './PromptButton/index.vue'
import { resolveAgentPrompts } from '#blokkli/agent/app/helpers/resolveAgentPrompts'
import type { AgentPromptDefinition } from '#blokkli/agent/app/types'

const props = defineProps<{
  agentName: string
  /** Whether a prompt is currently being started. */
  disabled: boolean
}>()

const emit = defineEmits<{
  (e: 'prompt', value: string): void
  (e: 'promptDefinition', value: AgentPromptDefinition): void
}>()

const app = useBlokkli()
const { $t, ui } = app

// Computed because prompt factories resolve based on reactive editor state.
const promptDefinitions = computed(() => resolveAgentPrompts(app, 'welcome'))

const welcomeMd =
  ui.interfaceLanguage.value === 'de' ? welcomeMdDe : welcomeMdEn

const welcomeContent = welcomeMd.replaceAll('@agent-name', props.agentName)

const disclaimer = computed(() => {
  return $t(
    'aiAgentWelcomeDisclaimer',
    `@agent can make mistakes! Always check the output. <strong>Do not enter sensitive information.</strong>`,
  ).replace('@agent', props.agentName)
})
</script>

<style lang="postcss">
.bk-agent-welcome-text {
  ul + p {
    @apply mt-30;
  }

  ul:nth-child(3),
  ul:nth-child(5) {
    @apply list-none pl-0;
    li {
      @apply relative pl-[1.5em] text-pretty;
      &:not(:last-child) {
        @apply mb-3;
      }
      &:before {
        font-size: 0.8em;
        @apply absolute left-0 top-0;
      }
    }
  }

  ul:nth-child(3) {
    li {
      &:before {
        content: '';
        @apply text-lime-normal;
      }
    }
  }

  ul:nth-child(5) {
    li {
      &:before {
        content: '';
        @apply text-red-normal;
      }
    }
  }
}
</style>
