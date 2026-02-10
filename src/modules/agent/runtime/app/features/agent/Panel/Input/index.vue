<template>
  <div class="bk-agent-input" @paste.capture="onPaste">
    <TransitionHeight opacity :duration="300">
      <div v-if="attachments.length" class="bk-agent-input-attachments">
        <AttachmentChip
          v-for="att in attachments"
          :key="att.id"
          :attachment="att"
          removable
          @remove="removeAttachment(att.id)"
        />
      </div>
    </TransitionHeight>
    <slot />
    <FlexTextarea
      ref="textarea"
      v-model="model"
      :max-height="150"
      submit-on-enter
      paste-markdown
      rows="2"
      :placeholder="placeholder"
      @submit="onSubmit"
    />

    <Actions
      :is-processing="isProcessing"
      :is-connected="isConnected"
      :can-submit="canSubmit"
      :usage-turns="usageTurns"
      :has-text
      @submit="onSubmit"
      @cancel="$emit('cancel')"
      @new-conversation="$emit('new-conversation')"
      @show-transcript="$emit('show-transcript')"
      @show-conversations="$emit('show-conversations')"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, useTemplateRef } from '#imports'
import { FlexTextarea } from '#blokkli/editor/components'
import { TransitionHeight } from '#blokkli/editor/components'
import AttachmentChip from '../Attachment/index.vue'
import Actions from './Actions/index.vue'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import type { Attachment } from '#blokkli/agent/app/types'
import type { UsageTurn } from '#blokkli/agent/shared/types'

const ATTACHMENT_THRESHOLD = 500

const props = defineProps<{
  isProcessing: boolean
  isConnected: boolean
  hasPendingApproval: boolean
  hasConversation: boolean
  usageTurns: UsageTurn[]
}>()

const { $t } = useBlokkli()

const placeholder = computed(() => {
  if (props.isProcessing) {
    return $t('aiAgentProcessing', 'Processing...')
  }
  if (props.hasPendingApproval) {
    return $t('aiAgentAwaitingApproval', 'Awaiting your approval...')
  }
  if (props.hasConversation) {
    return $t('aiAgentPlaceholderReply', 'Reply...')
  }
  return $t('aiAgentPlaceholder', 'What should we work on?')
})

const emit = defineEmits<{
  (e: 'submit', attachments: Attachment[]): void
  (
    e: 'cancel' | 'new-conversation' | 'show-transcript' | 'show-conversations',
  ): void
}>()

const model = defineModel<string>({ required: true })
const attachments = ref<Attachment[]>([])

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain')
  if (!text || text.length < ATTACHMENT_THRESHOLD) {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  attachments.value.push({
    type: 'text',
    id: generateUUID(),
    content: text,
  })
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter((a) => a.id !== id)
}

const hasText = computed<boolean>(() => !!model.value.trim())

const canSubmit = computed<boolean>(() => {
  return (
    (hasText.value || attachments.value.length > 0) &&
    !props.isProcessing &&
    props.isConnected
  )
})

function onSubmit() {
  if (!canSubmit.value) return
  emit('submit', attachments.value)
  attachments.value = []
}

const textarea = useTemplateRef('textarea')

function focus() {
  textarea.value?.focus()
}

function clearAttachments() {
  attachments.value = []
}

defineExpose({ focus, clearAttachments })
</script>
