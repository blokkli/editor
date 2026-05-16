<template>
  <ToolCard
    class="mt-0! overflow-hidden border-0 rounded-b-none rounded-t-lg border-dashed border-b border-b-mono-300"
    icon="bk_mdi_inventory"
    :title="plan.title"
    :hide-cancel="!pendingApproval"
    @cancel="$emit('reject')"
  >
    <div class="flex flex-col gap-10 px-10 text-sm py-8">
      <div
        v-for="(step, index) in plan.steps"
        :key="index"
        class="flex items-center gap-8"
      >
        <StatusIcon
          :status="planStepToStatus(step.status)"
          :bullet-text="index + 1"
        />
        <span
          :class="{
            'text-mono-500 line-through': step.status === 'completed',
            'font-medium': step.status === 'in_progress',
            'text-mono-600': step.status === 'pending',
          }"
        >
          {{ step.label }}
        </span>
      </div>
    </div>

    <template v-if="pendingApproval" #actions>
      <button
        class="bk-button bk-scheme-lime bk-is-fullwidth"
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
