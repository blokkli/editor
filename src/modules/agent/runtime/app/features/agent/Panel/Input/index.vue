<template>
  <div class="bk-agent-input" @paste.capture="onPaste">
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
    <TransitionHeight opacity>
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
    <Actions
      :is-processing="isProcessing"
      :is-connected="isConnected"
      :can-submit="canSubmit"
      @submit="onSubmit"
      @cancel="$emit('cancel')"
      @new-conversation="$emit('new-conversation')"
      @show-transcript="$emit('show-transcript')"
      @show-conversations="$emit('show-conversations')"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from '#imports'
import { FlexTextarea, TransitionHeight } from '#blokkli/editor/components'
import AttachmentChip from '../Attachment/index.vue'
import Actions from './Actions/index.vue'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import type { Attachment } from '#blokkli/agent/app/types'

const ATTACHMENT_THRESHOLD = 500

const props = defineProps<{
  placeholder: string
  isProcessing: boolean
  isConnected: boolean
}>()

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

const canSubmit = computed(() => {
  return (
    (model.value.trim().length > 0 || attachments.value.length > 0) &&
    !props.isProcessing &&
    props.isConnected
  )
})

function onSubmit() {
  if (!canSubmit.value) return
  emit('submit', attachments.value)
  attachments.value = []
}

const textarea = ref<InstanceType<typeof FlexTextarea> | null>(null)

function focus() {
  textarea.value?.focus()
}

function clearAttachments() {
  attachments.value = []
}

defineExpose({ focus, clearAttachments })
</script>
