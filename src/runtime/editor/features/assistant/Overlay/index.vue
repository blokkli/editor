<template>
  <FormOverlay
    id="assistant"
    :title="$t('assistantDialogTitle', 'Generate content with AI assistant')"
    icon="robot"
    @close="onClose"
  >
    <div class="bk-assistant-form">
      <div class="bk">
        <p class="bk-lead">
          {{
            $t(
              'assistantDialogLead',
              "Please enter what you'd like the assistant to generate.",
            )
          }}
        </p>
        <label class="bk-form-label" for="assistant_prompt">
          {{ $t('assistantPromptLabel', 'Prompt') }}
        </label>
        <div class="bk-assistant-form-textarea">
          <textarea
            id="assistant_prompt"
            v-model="prompt"
            type="text"
            class="bk-form-input"
            rows="10"
            :placeholder="
              $t(
                'assistantPromptPlaceholder',
                'Generate content for a page about how taxes work in Switzerland',
              )
            "
            required
          />
          <button
            class="bk-button bk-is-small"
            :class="{ 'bk-is-loading': isGenerating }"
            @click.prevent="onGenerate"
          >
            Generate
          </button>
        </div>
      </div>
      <div class="bk-assistant-form-result">
        <div class="bk-form-label">Result</div>
        <div>
          <template v-if="result">
            <ResultMarkup
              v-if="result.type === 'markup'"
              :markup="result.content"
            />
          </template>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="bk-button bk-is-primary" @click="onSubmit">
        {{ $t('assistantDialogSubmit', 'Create blocks') }}
      </button>
    </template>
  </FormOverlay>
</template>

<script setup lang="ts">
import { FormOverlay } from '#blokkli/editor/components'
import { useBlokkli, ref } from '#imports'
import type { AssistantResult } from '../types';
import ResultMarkup from './ResultMarkup/index.vue'

const { $t, adapter } = useBlokkli()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', result: AssistantResult): void
}>()

const prompt = ref('')
const isGenerating = ref(false)
const result = ref<AssistantResult | null>({
  type: 'markup',
  content: '',
})

const onSubmit = () => {
  if (!result.value) {
    emit('close')
    return
  }

  emit('submit', result.value)
}
const onClose = () => {
  emit('close')
}

const onGenerate = async () => {
  if (isGenerating.value) {
    return
  }
  isGenerating.value = true

  try {
    const fetched = await adapter.assistantGetResults!({
      type: 'create',
      prompt: prompt.value,
    })
    result.value = fetched || null
  } catch (_e) {
    // Noop.
  }

  isGenerating.value = false
}
</script>

<script lang="ts">
export default {
  name: 'AssistantOverlay',
}
</script>
