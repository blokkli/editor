<template>
  <BubbleTool :text :icon />
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import BubbleTool from '../Bubble/Tool/index.vue'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'server_tool'
  tool:
    | 'load_skills'
    | 'load_tools'
    | 'create_plan'
    | 'complete_plan_step'
    | 'plan_completed'
  label: string
}>()

const { $t } = useBlokkli()

const text = computed(() => {
  if (props.tool === 'load_skills') {
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

const icon = computed<BlokkliIcon>(() => {
  if (props.tool === 'load_skills') {
    return 'bk_mdi_book_2'
  } else if (props.tool === 'create_plan') {
    return 'bk_mdi_inventory'
  } else if (props.tool === 'complete_plan_step') {
    return 'bk_mdi_check'
  } else if (props.tool === 'plan_completed') {
    return 'bk_mdi_done_all'
  }

  return 'bk_mdi_build-fill'
})
</script>
