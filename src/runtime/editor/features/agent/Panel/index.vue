<template>
  <div class="bk bk-agent-panel">
    <div ref="scrollContainer" class="bk-agent-panel-inner" @scroll="onScroll">
      <!-- Conversation history with inline tool calls -->
      <Conversation v-if="conversation.length" :messages="conversation" />

      <!-- Pending changes -->
      <PendingChanges
        v-if="pendingChanges.length && !isProcessing"
        :changes="pendingChanges"
        @accept="$emit('accept')"
        @reject="$emit('reject')"
      />
    </div>

    <!-- Input area -->
    <div class="bk-agent-input">
      <FlexTextarea
        ref="textarea"
        v-model="inputValue"
        :max-height="150"
        submit-on-enter
        rows="1"
        :placeholder="placeholder"
        :disabled="isProcessing"
        @submit="onSubmit"
      />
      <div class="bk-agent-input-actions">
        <button
          class="bk-agent-debug-btn"
          title="Log WebSocket messages to console"
          @click="$emit('debug')"
        >
          <Icon name="bk_mdi_bug_outline" />
        </button>
        <button
          v-if="isProcessing"
          class="bk-agent-cancel-btn"
          @click="$emit('cancel')"
        >
          <Icon name="bk_mdi_stop" />
        </button>
        <button
          v-else
          class="bk-agent-submit-btn"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          <Icon name="bk_mdi_arrow_upward" />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useTemplateRef,
  onMounted,
  nextTick,
  watch,
  useBlokkli,
} from '#imports'
import { Icon, FlexTextarea } from '#blokkli/editor/components'
import Conversation from './Conversation.vue'
import PendingChanges from './PendingChanges.vue'
import type { AgentMessage, PendingChange } from '../types'

const props = defineProps<{
  conversation: AgentMessage[]
  isProcessing: boolean
  pendingChanges: PendingChange[]
}>()

const emit = defineEmits<{
  (e: 'send-prompt', prompt: string): void
  (e: 'accept'): void
  (e: 'reject'): void
  (e: 'cancel'): void
  (e: 'debug'): void
}>()

const { $t } = useBlokkli()

const inputValue = ref('')
const textarea = useTemplateRef('textarea')
const scrollContainer = useTemplateRef('scrollContainer')

// Track if user is at the bottom of the scroll container
const isAtBottom = ref(true)
const SCROLL_THRESHOLD = 50 // pixels from bottom to consider "at bottom"

function onScroll() {
  if (!scrollContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
}

function scrollToBottom() {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
}

// Auto-scroll when conversation changes, but only if user was at bottom
watch(
  () => props.conversation,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
  { deep: true },
)

const canSubmit = computed(() => {
  return inputValue.value.trim().length > 0 && !props.isProcessing
})

const placeholder = computed(() => {
  if (props.isProcessing) {
    return $t('aiAgentThinking', 'Processing...')
  }
  if (props.pendingChanges.length) {
    return $t(
      'aiAgentRefine',
      'Type to refine changes or accept/reject above...',
    )
  }
  return $t('aiAgentPlaceholder', 'Ask me to edit the page content...')
})

function onSubmit() {
  if (!canSubmit.value) return

  emit('send-prompt', inputValue.value)
  inputValue.value = ''
}

onMounted(() => {
  nextTick(() => textarea.value?.focus())
})
</script>
