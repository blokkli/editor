<template>
  <div class="bk-agent-pending-changes">
    <div class="bk-agent-pending-header">
      <Icon name="bk_mdi_pending_actions" />
      <span>{{ $t('aiAgentPendingChanges', 'Pending changes') }}</span>
      <span class="bk-agent-pending-count">{{ changes.length }}</span>
    </div>

    <div class="bk-agent-pending-list">
      <div
        v-for="(change, index) in changes"
        :key="index"
        class="bk-agent-pending-item"
        :class="'bk-is-' + change.type"
      >
        <Icon :name="getChangeIcon(change.type)" class="bk-agent-pending-item-icon" />
        <span class="bk-agent-pending-item-text">{{ formatChange(change) }}</span>
      </div>
    </div>

    <div class="bk-agent-pending-actions">
      <button class="bk-agent-reject-btn" @click="$emit('reject')">
        <Icon name="bk_mdi_close" />
        {{ $t('aiAgentReject', 'Reject all') }}
      </button>
      <button class="bk-agent-accept-btn" @click="$emit('accept')">
        <Icon name="bk_mdi_check" />
        {{ $t('aiAgentAccept', 'Accept all') }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { PendingChange } from '../types'
import type { BlokkliIcon } from '#blokkli-build/icons'

defineProps<{
  changes: PendingChange[]
}>()

defineEmits<{
  (e: 'accept'): void
  (e: 'reject'): void
}>()

const { $t } = useBlokkli()

function getChangeIcon(type: PendingChange['type']): BlokkliIcon {
  switch (type) {
    case 'rewrite':
      return 'bk_mdi_edit'
    case 'add':
      return 'bk_mdi_add'
    case 'delete':
      return 'bk_mdi_delete'
    case 'move':
      return 'bk_mdi_drag_pan'
  }
}

function formatChange(change: PendingChange): string {
  switch (change.type) {
    case 'rewrite':
      return `Rewrite ${change.fieldName} on block`
    case 'add':
      return `Add new ${change.bundle} block`
    case 'delete':
      return `Delete block`
    case 'move':
      return `Move block`
  }
}
</script>
