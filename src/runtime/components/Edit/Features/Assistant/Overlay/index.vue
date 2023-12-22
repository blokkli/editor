<template>
  <DialogModal
    :title="text('assistantDialogTitle')"
    :lead="text('assistantDialogLead')"
    :submit-label="text('assistantDialogSubmit')"
    :width="1200"
    :can-submit="!!result"
    icon="robot"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <div class="bk-dialog-form bk-assistant-dialog">
      <div class="bk">
        <label class="bk-form-label" for="assistant_prompt">
          {{ text('assistantPromptLabel') }}
        </label>
        <div class="bk-assistant-dialog-textarea">
          <textarea
            id="assistant_prompt"
            v-model="prompt"
            type="text"
            class="bk-form-input"
            rows="10"
            :placeholder="text('assistantPromptPlaceholder')"
            required
          />
          <button
            @click.prevent="onGenerate"
            class="bk-button is-small"
            :class="{ 'bk-is-loading': isGenerating }"
          >
            Generate
          </button>
        </div>
      </div>
      <div class="bk-assistant-dialog-result">
        <div class="bk-form-label">Result</div>
        <div class="bk-assistant-dialog-result-inner">
          <template v-if="result">
            <ResultMarkup
              v-if="result.type === 'markup'"
              :markup="result.content"
            />
          </template>
        </div>
      </div>
    </div>
  </DialogModal>
</template>

<script setup lang="ts">
import { DialogModal } from '#blokkli/components'
import type { AssistantResult } from '#blokkli/types'
import { useBlokkli } from '#imports'
import ResultMarkup from './ResultMarkup/index.vue'

const { text, adapter } = useBlokkli()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', result: AssistantResult): void
}>()

const prompt = ref(
  `Write content for a page talking about VueJS. Please come up with good titles and content for each section.

# Origins
Write about when Vue was created and by whom.

# Release of Vue 2
When was it released, what were the changes.

# Release of Vue 3
Write about the big changes introduced in Vue 3.

# Comparison to React
`,
)
const isGenerating = ref(false)
const result = ref<AssistantResult | null>(null)

const onSubmit = () => {
  if (!result.value) {
    emit('close')
    return
  }

  emit('submit', result.value)
}
const onCancel = () => {
  emit('close')
}

const onGenerate = async () => {
  if (isGenerating.value) {
    return
  }
  isGenerating.value = true

  try {
    const fetched = await adapter.assistantGetResults!({
      prompt: prompt.value,
    })
    result.value = fetched || null
  } catch (_e) {}

  isGenerating.value = false

  console.log(result)
}
</script>
