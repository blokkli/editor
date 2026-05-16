<template>
  <div class="mt-10 p-10 border border-mono-300 rounded">
    <div class="flex items-center justify-between gap-8">
      <span class="text-sm font-semibold">
        {{
          rating
            ? $t('aiAgentFeedbackThanks', 'Thanks for your feedback!')
            : $t('aiAgentFeedbackPrompt', 'How was this response?')
        }}
      </span>
      <div class="flex relative -mr-3">
        <button
          v-for="option in options"
          :key="option.value"
          class="block disabled:pointer-events-none px-3 group/tooltip group"
          :disabled="submitted && option.value !== rating"
          @click="onRate(option.value)"
        >
          <div
            class="size-30 flex items-center justify-center rounded-full text-mono-600 group-hover:bg-mono-200"
            :class="[
              'bk-scheme-' + option.theme,
              {
                '!bg-scheme-normal !text-scheme-text': rating === option.value,
                '!text-mono-300': submitted && option.value !== rating,
              },
            ]"
          >
            <Icon :name="option.icon" class="size-[16px]" />
            <Tooltip
              :label="option.label"
              placement="above-right"
              class="w-full"
            />
          </div>
        </button>
      </div>
    </div>
    <TransitionHeight opacity :duration="300">
      <div v-if="rating && !submitted" class="flex flex-col gap-10 mt-10">
        <textarea
          v-model="comment"
          class="text-sm p-8 rounded border border-mono-300 bg-white resize-none focus:border-mono-500 focus:outline-none"
          :rows="2"
          :placeholder="
            $t('aiAgentFeedbackPlaceholder', 'Tell us more (optional)...')
          "
        />
        <button
          class="bk-button bk-is-small bk-scheme-accent self-end"
          @click="onSubmit"
        >
          {{ $t('aiAgentFeedbackSubmit', 'Submit') }}
        </button>
      </div>
    </TransitionHeight>
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { Icon, TransitionHeight, Tooltip } from '#blokkli/editor/components'
import { useAgentFeedbackOptions } from '#blokkli/agent/app/composables'
import type { AgentConversationFeedbackRating } from '../../types'

const { $t } = useBlokkli()

const emit = defineEmits<{
  submit: [rating: AgentConversationFeedbackRating, comment?: string]
  done: []
}>()

const options = useAgentFeedbackOptions()

const rating = ref<AgentConversationFeedbackRating | null>(null)
const comment = ref('')
const submitted = ref(false)

function onRate(value: AgentConversationFeedbackRating) {
  if (submitted.value) {
    return
  }
  rating.value = value
  emit('submit', value)
}

function onSubmit() {
  if (!rating.value) return
  submitted.value = true
  if (comment.value) {
    emit('submit', rating.value, comment.value || undefined)
  }
  emit('done')
}
</script>
