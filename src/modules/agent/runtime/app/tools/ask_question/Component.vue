<template>
  <ToolCard
    icon="bk_mdi_help"
    :title="params.question"
    class="bk-agent-tool-question"
    @cancel="cancel"
  >
    <div class="bk-agent-tool-question-inner">
      <FormCheckboxes
        v-if="params.multiSelect"
        id="ask-question"
        v-model="selectedMulti"
        label=""
        :options="params.options"
      />

      <div v-else>
        <FormRadio
          id="ask-question"
          v-model="selectedSingle"
          label=""
          :options="radioOptions"
        />
        <div v-if="isOtherSelected" class="bk-agent-tool-question-other">
          <textarea
            ref="otherTextarea"
            v-model="otherText"
            class="bk-form-input"
            :rows="2"
            :placeholder="
              $t('aiAgentAskQuestionOtherPlaceholder', 'Type your answer...')
            "
          />
        </div>
      </div>
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-scheme-lime bk-is-fullwidth"
        :disabled="!hasSelection"
        @click="confirm"
      >
        <Icon name="bk_mdi_check" />
        {{ $t('aiAgentConfirm', 'Confirm') }}
      </button>
    </template>
  </ToolCard>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onMounted, useBlokkli } from '#imports'
import { Icon, FormRadio, FormCheckboxes } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { AskQuestionParams, AskQuestionResult } from './index'

const OTHER_VALUE = '__other__'

const props = defineProps<{
  context: McpToolContext
  params: AskQuestionParams
}>()

const emit = defineEmits<{
  (e: 'done', result: AskQuestionResult): void
}>()

const { $t, eventBus } = useBlokkli()

onMounted(() => {
  if (props.params.paragraphUuids?.length) {
    eventBus.emit('select', props.params.paragraphUuids)
    eventBus.emit('scrollSelectionIntoView', {})
  }
})

const selectedSingle = ref<string>('')
const selectedMulti = ref<string[]>([])
const otherText = ref('')
const otherTextarea = ref<HTMLTextAreaElement | null>(null)

const radioOptions = computed(() => [
  ...props.params.options,
  {
    value: OTHER_VALUE,
    label: $t('aiAgentAskQuestionOther', 'None of the above'),
  },
])

const isOtherSelected = computed(() => selectedSingle.value === OTHER_VALUE)

watch(isOtherSelected, (isOther) => {
  if (isOther) {
    nextTick(() => {
      otherTextarea.value?.focus()
    })
  }
})

const hasSelection = computed(() => {
  if (props.params.multiSelect) {
    return selectedMulti.value.length > 0
  }
  if (isOtherSelected.value) {
    return otherText.value.trim().length > 0
  }
  return selectedSingle.value !== ''
})

function getSelectedLabel(): string {
  if (props.params.multiSelect) {
    const labels = selectedMulti.value
      .map((v) => props.params.options.find((o) => o.value === v)?.label)
      .filter(Boolean)
    return labels.join(', ')
  }
  if (isOtherSelected.value) {
    return otherText.value.trim()
  }
  return (
    props.params.options.find((o) => o.value === selectedSingle.value)?.label ||
    selectedSingle.value
  )
}

function confirm() {
  const selectedLabel = getSelectedLabel()
  const label = `${props.params.question} -> ${selectedLabel}`
  if (props.params.multiSelect) {
    emit('done', { selected: selectedMulti.value, label })
  } else {
    const value = isOtherSelected.value
      ? otherText.value.trim()
      : selectedSingle.value
    emit('done', { selected: value, label })
  }
}

function cancel() {
  emit('done', { selected: null, label: $t('aiAgentCancelled', 'Cancelled') })
}
</script>
