<template>
  <ToolCard :icon="actionIcon" :title="action.label" @cancel="$emit('reject')">
    <template #actions>
      <button
        class="bk-button bk-is-small bk-scheme-lime bk-is-fullwidth"
        @click="$emit('approve')"
      >
        <Icon name="bk_mdi_check" />
        {{ $t('aiAgentApprove', 'Approve') }}
      </button>
      <button
        class="bk-button bk-is-small bk-scheme-lime bk-is-outline"
        @click="$emit('always-approve')"
      >
        <Icon name="bk_mdi_done_all" />
        {{ $t('aiAgentAlwaysApprove', 'Always') }}
      </button>
    </template>
  </ToolCard>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import ToolCard from '../ToolCard/index.vue'
import type { MutationAction } from '#blokkli/agent/app/types'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<{
  action: MutationAction
}>()

defineEmits<{
  (e: 'approve' | 'reject' | 'always-approve'): void
}>()

const { $t } = useBlokkli()

const actionIcon = computed((): BlokkliIcon => {
  switch (props.action.type) {
    case 'rewrite':
      return 'bk_mdi_edit'
    case 'add':
      return 'bk_mdi_add'
    case 'delete':
      return 'bk_mdi_delete'
    case 'move':
      return 'bk_mdi_drag_pan'
    case 'options':
      return 'bk_mdi_tune'
    default:
      return 'bk_mdi_edit'
  }
})
</script>
