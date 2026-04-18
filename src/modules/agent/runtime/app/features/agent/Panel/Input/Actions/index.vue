<template>
  <div class="bk-agent-input-actions">
    <TransitionHeight opacity>
      <div v-if="isExpanded" class="bk-agent-input-actions-expanded">
        <TokenUsage :usage-turns />
        <DropdownItem
          icon="bk_mdi_bug_report"
          :text="$t('aiAgentShowTranscript', 'Show transcript...')"
          @click="$emit('show-transcript')"
        />
        <DropdownItem
          icon="bk_mdi_forum"
          :text="$t('aiAgentPastConversations', 'Past conversations')"
          :disabled="!isConnected"
          @click="$emit('show-conversations')"
        />
      </div>
    </TransitionHeight>
    <div class="bk-agent-input-actions-bar">
      <div class="bk-agent-input-actions-left">
        <button
          class="bk-agent-input-actions-button group/tooltip"
          :class="{ 'bk-is-active': isExpanded }"
          :disabled="!isConnected"
          @click="isExpanded = !isExpanded"
        >
          <Icon
            :name="isExpanded ? 'bk_mdi_collapse_all' : 'bk_mdi_expand_all'"
          />
          <Tooltip
            v-show="!isExpanded"
            :label="$t('aiAgentExpandButton', 'Show more')"
            placement="above-left"
          />
        </button>
        <button
          v-show="!hasText && hasConversation"
          class="bk-agent-input-actions-button"
          :disabled="!isConnected"
          @click="$emit('new-conversation')"
        >
          <Icon name="bk_mdi_add" />
          <span>{{
            $t('aiAgentNewConversation', 'Start new conversation')
          }}</span>
        </button>
      </div>
      <div class="bk-agent-input-actions-right">
        <div v-show="hasText" class="bk-agent-input-actions-keyboard">
          {{ $t('textareaNewLineHint', 'Shift + Enter for new line') }}
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
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import {
  Icon,
  DropdownItem,
  TransitionHeight,
  Tooltip,
} from '#blokkli/editor/components'
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

defineEmits<{
  submit: []
  cancel: []
  'new-conversation': []
  'show-transcript': []
  'show-conversations': []
}>()

const { $t } = useBlokkli()

const isExpanded = ref(false)
</script>
