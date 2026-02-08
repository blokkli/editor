<template>
  <ToolCard
    class="bk-agent-plan"
    icon="bk_mdi_inventory"
    :title="plan.title"
    :hide-cancel="!pendingApproval"
    @cancel="$emit('reject')"
  >
    <div class="bk-agent-plan-steps">
      <div
        v-for="(step, index) in plan.steps"
        :key="index"
        class="bk-agent-plan-step"
        :class="{
          'bk-is-pending': step.status === 'pending',
          'bk-is-in-progress': step.status === 'in_progress',
          'bk-is-completed': step.status === 'completed',
        }"
      >
        <StatusIcon :status="planStepToStatus(step.status)" />
        <span class="bk-agent-plan-step-label">{{ step.label }}</span>
      </div>
    </div>

    <template v-if="pendingApproval" #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
        @click="$emit('approve')"
      >
        <Icon name="bk_mdi_check" />
        {{ $t('aiAgentApprovePlan', 'Accept plan') }}
      </button>
    </template>
  </ToolCard>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon, StatusIcon } from '#blokkli/editor/components'
import type { ClientPlanState } from '#blokkli/agent/shared/types'
import ToolCard from '../ToolCard/index.vue'

defineProps<{
  plan: ClientPlanState
  pendingApproval: boolean
}>()

defineEmits<{
  approve: []
  reject: []
}>()

const { $t } = useBlokkli()

function planStepToStatus(
  stepStatus: 'pending' | 'in_progress' | 'completed',
): 'pending' | 'active' | 'success' {
  if (stepStatus === 'completed') return 'success'
  if (stepStatus === 'in_progress') return 'active'
  return 'pending'
}
</script>
