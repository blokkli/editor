<template>
  <div class="mt-10 p-10 border border-mono-300 rounded-lg">
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
          :disabled="!comment"
          @click="onSubmit"
        >
          {{ $t('aiAgentFeedbackSubmit', 'Submit') }}
        </button>
      </div>
    </TransitionHeight>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { Icon, TransitionHeight, Tooltip } from '#blokkli/editor/components'
import type { AgentConversationFeedbackRating } from '../../types'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { ThemeColorName } from '~~/src/global/types/theme'

const { $t } = useBlokkli()

const emit = defineEmits<{
  submit: [rating: AgentConversationFeedbackRating, comment?: string]
  done: []
}>()

type FeedbackOption = {
  value: AgentConversationFeedbackRating
  label: string
  icon: BlokkliIcon
  theme: ThemeColorName
}

const options = computed<FeedbackOption[]>(() => {
  return [
    {
      value: 'bad',
      label: $t('aiAgentFeedbackBad', 'Bad'),
      icon: 'bk_mdi_thumb_down',
      theme: 'red',
    },
    {
      value: 'fine',
      label: $t('aiAgentFeedbackFine', 'Fine'),
      icon: 'bk_mdi_thumb_up',
      theme: 'yellow',
    },
    {
      value: 'good',
      label: $t('aiAgentFeedbackGood', 'Good'),
      icon: 'bk_mdi_thumbs_up_double',
      theme: 'lime',
    },
  ]
})

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
  emit('submit', rating.value, comment.value || undefined)
  emit('done')
}
</script>
