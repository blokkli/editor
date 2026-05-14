<template>
  <PanelItem
    :title="activeChartType.editor.label"
    :description="activeChartType.editor.description"
    :icon="activeChartType.editor.icon"
    @click="showOptions = !showOptions"
  >
    <TransitionCollapse>
      <div v-if="showOptions" class="border-t border-t-mono-300">
        <PanelItem
          v-for="option in chartTypes"
          :key="option.id"
          :title="option.editor.label"
          :description="option.editor.description"
          :icon="option.editor.icon"
          :theme="option.id === modelValue ? 'accent' : 'mono'"
          @click="onClick(option.id)"
        />
      </div>
    </TransitionCollapse>
  </PanelItem>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli } from '#imports'
import type { ChartType, ChartTypeDefinition } from '../../../../types'
import { getChartTypes } from '../../../../chart-types'
import PanelItem from '#blokkli/editor/components/Panel/Item/index.vue'
import TransitionCollapse from '#blokkli/editor/components/Transition/Collapse/index.vue'

const props = defineProps<{
  modelValue: ChartType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ChartType]
}>()

const { $t } = useBlokkli()

const chartTypes = computed<ChartTypeDefinition[]>(() => getChartTypes($t))

const showOptions = ref(false)

const activeChartType = computed<ChartTypeDefinition>(() => {
  return (
    chartTypes.value.find((v) => v.id === props.modelValue) ||
    chartTypes.value[0]!
  )
})

function onClick(id: string) {
  emit('update:modelValue', id as ChartType)
}
</script>
