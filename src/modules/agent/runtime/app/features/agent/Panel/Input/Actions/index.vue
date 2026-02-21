<template>
  <div class="bk-agent-input-actions">
    <div class="bk-agent-input-actions-left">
      <button
        class="bk-agent-input-actions-button"
        :disabled="!isConnected || !hasConversation"
        @click="emit('new-conversation')"
      >
        <Icon name="bk_mdi_add" />
        <div class="bk-tooltip">
          <span>{{
            $t('aiAgentNewConversation', 'Start new conversation')
          }}</span>
        </div>
      </button>
      <button
        class="bk-agent-input-actions-button"
        :disabled="!isConnected"
        @click="emit('show-conversations')"
      >
        <Icon name="bk_mdi_forum" />
        <div class="bk-tooltip">
          <span>{{
            $t('aiAgentPastConversations', 'Past conversations')
          }}</span>
        </div>
      </button>
      <Dropdown ref="dropdown" :disabled="!isConnected">
        <template #button>
          <div
            class="bk-agent-input-actions-button"
            :title="$t('aiAgentMoreOptions', 'More options')"
          >
            <Icon name="bk_mdi_more_vert" />
          </div>
        </template>
        <TokenUsage :usage-turns />
        <hr />
        <DropdownItem
          icon="bk_mdi_bug_report"
          :text="$t('aiAgentShowTranscript', 'Show transcript...')"
          @click="onShowTranscript"
        />
      </Dropdown>
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
import { useTemplateRef, useBlokkli } from '#imports'
import { Icon, Dropdown, DropdownItem } from '#blokkli/editor/components'
import TokenUsage from './TokenUsage/index.vue'
import type { UsageTurn } from '#blokkli/agent/shared/types'

defineProps<{
  isProcessing: boolean
  isConnected: boolean
  canSubmit: boolean
  hasText: boolean
  hasConversation: boolean
  usageTurns: UsageTurn[]
}>()

const emit = defineEmits<{
  submit: []
  cancel: []
  'new-conversation': []
  'show-transcript': []
  'show-conversations': []
}>()

const { $t } = useBlokkli()

const dropdown = useTemplateRef('dropdown')

function onShowTranscript() {
  dropdown.value?.close()
  emit('show-transcript')
}
</script>
