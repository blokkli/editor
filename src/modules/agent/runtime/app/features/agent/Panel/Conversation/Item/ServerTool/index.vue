<template>
  <div class="bk-agent-assistant-bubble bk-is-tool bk-is-server-tool">
    <div class="bk-agent-tool-call bk-is-server-tool">
      <Icon
        :name="getServerSideToolIcon(tool)"
        class="bk-agent-tool-call-status"
      />
      <span>{{ serverToolLabel }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'server_tool'
  tool:
    | 'load_skill'
    | 'load_tools'
    | 'create_plan'
    | 'complete_plan_step'
    | 'plan_completed'
  label: string
}>()

const { $t } = useBlokkli()

const serverToolLabel = computed(() => {
  if (props.tool === 'load_skill') {
    return $t('aiAgentLoadSkill', 'Using skill "@label"').replace(
      '@label',
      props.label,
    )
  }
  if (props.tool === 'load_tools') {
    return $t('aiAgentLoadTools', '@count tools loaded').replace(
      '@count',
      props.label,
    )
  }
  if (props.tool === 'create_plan') {
    return $t('aiAgentCreatePlan', 'Plan: @label').replace(
      '@label',
      props.label,
    )
  }
  if (props.tool === 'complete_plan_step') {
    return $t('aiAgentCompletePlanStep', 'Completed: @label').replace(
      '@label',
      props.label,
    )
  }
  if (props.tool === 'plan_completed') {
    return $t('aiAgentPlanCompleted', 'Plan completed: @label').replace(
      '@label',
      props.label,
    )
  }
  return props.label
})

function getServerSideToolIcon(
  id:
    | 'load_skill'
    | 'load_tools'
    | 'create_plan'
    | 'complete_plan_step'
    | 'plan_completed',
): BlokkliIcon {
  if (id === 'load_skill') {
    return 'bk_mdi_book_2'
  }
  if (id === 'create_plan') {
    return 'bk_mdi_inventory'
  }
  if (id === 'complete_plan_step') {
    return 'bk_mdi_check'
  }
  if (id === 'plan_completed') {
    return 'bk_mdi_done_all'
  }

  return 'bk_mdi_build-fill'
}
</script>
