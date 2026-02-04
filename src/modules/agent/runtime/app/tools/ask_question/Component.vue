<template>
  <ToolCard
    icon="bk_mdi_help"
    :title="params.question"
    @cancel="cancel"
    class="bk-agent-tool-question"
  >
    <div class="bk-agent-tool-question-inner">
      <!-- Multi-select: Checkboxes -->
      <FormCheckboxes
        v-if="params.multiSelect"
        id="ask-question"
        label=""
        :options="params.options"
        v-model="selectedMulti"
      />

      <!-- Single-select: Radio -->
      <FormRadio
        v-else
        id="ask-question"
        label=""
        :options="params.options"
        v-model="selectedSingle"
      />
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
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
import { ref, computed, useBlokkli } from '#imports'
import { Icon, FormRadio, FormCheckboxes } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { AskQuestionParams, AskQuestionResult } from './index'

const props = defineProps<{
  context: McpToolContext
  params: AskQuestionParams
}>()

const emit = defineEmits<{
  (e: 'done', result: AskQuestionResult): void
}>()

const { $t } = useBlokkli()

const selectedSingle = ref<string>('')
const selectedMulti = ref<string[]>([])

const hasSelection = computed(() => {
  if (props.params.multiSelect) {
    return selectedMulti.value.length > 0
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
  return (
    props.params.options.find((o) => o.value === selectedSingle.value)?.label ||
    selectedSingle.value
  )
}

function confirm() {
  const userMessage = getSelectedLabel()
  const label = props.params.question
  if (props.params.multiSelect) {
    emit('done', { selected: selectedMulti.value, label, userMessage })
  } else {
    emit('done', { selected: selectedSingle.value, label, userMessage })
  }
}

function cancel() {
  emit('done', { selected: null, label: $t('aiAgentCancelled', 'Cancelled') })
}
</script>
