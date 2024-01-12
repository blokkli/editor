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
            class="bk-button is-small"
            :class="{ 'bk-is-loading': isGenerating }"
            @click.prevent="onGenerate"
          >
            Generate
          </button>
        </div>
      </div>
      <div class="bk-assistant-form-result">
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
    <template #footer>
      <button class="bk-button bk-is-primary" @click="onSubmit">
        {{ $t('assistantDialogSubmit', 'Create blocks') }}
      </button>
    </template>
  </FormOverlay>
</template>

<script setup lang="ts">
import { FormOverlay } from '#blokkli/components'
import type { AssistantResult } from '#blokkli/types'
import { useBlokkli, ref } from '#imports'
import ResultMarkup from './ResultMarkup/index.vue'

const { $t, adapter } = useBlokkli()

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
const result = ref<AssistantResult | null>({
  type: 'markup',
  content: `
<h2>Origins</h2>
<p>Vue was created in 2014 by Evan You, a former Google engineer. It was initially released to the public in February 2014.</p>

<h2>Release of Vue 2</h2>
<p>Vue 2 was released in September 2016. This release introduced significant improvements in performance and the virtual DOM implementation, making Vue even more efficient and capable.</p>

<h2>Release of Vue 3</h2>
<p>Vue 3, released in September 2020, brought several major changes, including the composition API, better TypeScript integration, and significant improvements in terms of performance, tree-shaking, and the overall developer experience.</p>

<h2>Comparison to React</h2>
<p>Vue is often compared to React due to their shared focus on building user interfaces. While React is developed and maintained by Facebook, Vue is an open-source project led by Evan You. Both frameworks have their strengths and weaknesses, and the choice between them often depends on the specific requirements of a project and the preferences of the development team.</p>
`,
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
