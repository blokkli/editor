<template>
  <div>
    <div
      class="bk-agent-message-text bk-agent-welcome-text"
      v-html="welcomeHtml"
    />
    <div v-if="defaultPrompts.length" class="grid gap-5 mt-10">
      <button
        v-for="(prompt, index) in defaultPrompts"
        :key="index"
        type="button"
        class="bk-button bk-is-small bk-scheme-accent bk-is-light justify-start!"
        @click.prevent="emit('prompt', prompt)"
      >
        <Icon name="bk_mdi_chat" />
        <span>{{ prompt }}</span>
      </button>
    </div>
    <InfoBox :text="disclaimer" class="mt-20" small />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { marked } from 'marked'
import welcomeMdEn from './en.md?raw'
import welcomeMdDe from './de.md?raw'
import { defaultPrompts } from '#blokkli-build/agent-client'
import { Icon, InfoBox } from '#blokkli/editor/components'

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
