<template>
  <div class="bk-agent-input-actions">
    <div class="bk-agent-input-actions-left">
      <div ref="menuContainer">
        <button
          class="bk-button bk-is-white bk-is-small bk-is-icon-only"
          :title="$t('aiAgentMoreOptions', 'More options')"
          :disabled="!isConnected"
          @click="showMenu = !showMenu"
        >
          <Icon name="bk_mdi_more_horiz" />
        </button>
        <BlokkliTransition name="drop-up">
          <div v-if="showMenu" class="bk-agent-more-dropdown">
            <DropdownItem
              icon="bk_mdi_add"
              :text="$t('aiAgentNewConversation', 'Start new conversation')"
              @click="onNewConversation"
            />
            <DropdownItem
              icon="bk_mdi_history"
              :text="$t('aiAgentPastConversations', 'Past conversations')"
              @click="onShowConversations"
            />
            <hr />
            <DropdownItem
              icon="bk_mdi_bug_report"
              :text="$t('aiAgentShowTranscript', 'Show transcript...')"
              @click="onShowTranscript"
            />
            <div
              v-if="props.tokenUsage.inputTokens > 0"
              class="bk-agent-token-usage"
            >
              <Icon name="bk_mdi_toll" />
              <span>
                {{ props.tokenUsage.inputTokens.toLocaleString() }} in /
                {{ props.tokenUsage.outputTokens.toLocaleString() }} out
              </span>
            </div>
          </div>
        </BlokkliTransition>
      </div>
    </div>
    <div class="bk-agent-input-actions-right">
      <div v-show="hasText" class="bk-agent-input-actions-keyboard">
        {{ $t('aiAgentNewLineHint', 'Shift + Enter for new line') }}
      </div>
      <button
        v-if="isProcessing"
        class="bk-button bk-is-danger bk-is-small bk-is-icon-only"
        :disabled="!isConnected"
        @click="$emit('cancel')"
      >
        <Icon name="bk_mdi_stop" />
      </button>
      <button
        v-else
        class="bk-button bk-is-primary bk-is-small bk-is-icon-only"
        :disabled="!canSubmit"
        @click="$emit('submit')"
      >
        <Icon name="bk_mdi_arrow_upward" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
  useBlokkli,
} from '#imports'
import { Icon, BlokkliTransition } from '#blokkli/editor/components'
import DropdownItem from './DropdownItem.vue'

const props = defineProps<{
  isProcessing: boolean
  isConnected: boolean
  canSubmit: boolean
  hasText: boolean
  tokenUsage: { inputTokens: number; outputTokens: number }
}>()

const emit = defineEmits<{
  submit: []
  cancel: []
  'new-conversation': []
  'show-transcript': []
  'show-conversations': []
}>()

const { $t, eventBus } = useBlokkli()

const menuContainer = useTemplateRef('menuContainer')
const showMenu = ref(false)

function closeMenu() {
  showMenu.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (!menuContainer.value?.contains(e.target as Node)) {
    closeMenu()
  }
}

eventBus.on('mouse:up', closeMenu)

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  eventBus.off('mouse:up', closeMenu)
})

function onNewConversation() {
  showMenu.value = false
  emit('new-conversation')
}

function onShowConversations() {
  showMenu.value = false
  emit('show-conversations')
}

function onShowTranscript() {
  showMenu.value = false
  emit('show-transcript')
}
</script>
