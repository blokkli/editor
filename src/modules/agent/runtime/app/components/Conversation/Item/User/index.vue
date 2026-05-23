<template>
  <div class="bk-agent-message bk-is-user group/message relative">
    <InlineActions
      v-if="!isEditing && canRollback"
      class="absolute top-[7px] right-10 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100"
    >
      <InlineActionsButton
        icon="bk_mdi_replay"
        :label="$t('aiAgentRetry', 'Retry')"
        @click="onRetry"
      />
      <InlineActionsButton
        icon="bk_mdi_edit"
        :label="$t('edit', 'Edit')"
        @click="startEdit"
      />
    </InlineActions>

    <div v-if="isEditing" class="bg-white rounded-lg overflow-hidden">
      <FlexTextarea
        v-model="editValue"
        :max-height="300"
        :min-height="60"
        submit-on-enter
        autofocus
        class="w-full resize-none text-base p-10 border-none bg-transparent appearance-none text-mono-900 placeholder:text-mono-300 focus:outline-none"
        @submit="submitEdit"
        @keydown="onEditKeydown"
      />
      <div
        class="flex justify-end gap-5 px-10 py-10 border-t border-t-mono-400 border-dashed"
      >
        <button
          type="button"
          class="bk-button bk-scheme-mono bk-is-light bk-is-small"
          @click="cancelEdit"
        >
          {{ $t('cancel', 'Cancel') }}
        </button>
        <button
          type="button"
          class="bk-button bk-scheme-accent bk-is-small"
          :disabled="!editValue.trim() || editValue.trim() === content.trim()"
          @click="submitEdit"
        >
          {{ $t('save', 'Save') }}
        </button>
      </div>
    </div>
    <template v-else>
      <div v-if="html" class="bk-agent-message-text" v-html="html" />
      <div
        v-if="attachments?.length"
        class="grid gap-8"
        :class="{ 'mt-10': html }"
      >
        <AttachmentChip
          v-for="att in attachments"
          :key="att.id"
          :attachment="att"
          inverted
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { renderMarkdown } from '#blokkli/agent/app/helpers/markdown'
import AttachmentChip from '../../../Attachment/index.vue'
import type { Attachment } from '#blokkli/agent/app/types'
import InlineActions from '#blokkli/editor/components/InlineActions/index.vue'
import InlineActionsButton from '#blokkli/editor/components/InlineActions/Button/index.vue'
import { FlexTextarea } from '#blokkli/editor/components'
import { useAgent } from '#blokkli/agent/app/composables/useAgent'
import { isHistorySnapshotReachable } from '#blokkli/agent/app/helpers/historySignature'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'user'
  content: string
  attachments?: Attachment[]
  historyIndexAtSend?: number
  historySignatureAtSend?: string
}>()

const { $t, state } = useBlokkli()
const agent = useAgent(true)

const isEditing = ref(false)
const editValue = ref('')

const html = computed(() => {
  return props.content ? renderMarkdown(props.content) : ''
})

const canRollback = computed(
  () =>
    agent &&
    !agent.isProcessing.value &&
    isHistorySnapshotReachable(
      state.mutations.value,
      props.historyIndexAtSend,
      props.historySignatureAtSend,
    ),
)

function onRetry(): void {
  if (!agent) {
    return
  }
  agent.rollbackAndSend(props.id)
}

function startEdit(): void {
  editValue.value = props.content
  isEditing.value = true
}

function cancelEdit(): void {
  isEditing.value = false
  editValue.value = ''
}

function submitEdit(): void {
  if (!agent) {
    return
  }
  const next = editValue.value.trim()
  if (!next || next === props.content.trim()) {
    cancelEdit()
    return
  }
  isEditing.value = false
  agent.rollbackAndSend(props.id, next)
}

function onEditKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    cancelEdit()
  }
}
</script>
