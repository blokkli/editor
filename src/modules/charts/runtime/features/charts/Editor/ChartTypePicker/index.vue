<template>
  <PanelItem
    :title="activeChartType.editor.label"
    :description="activeChartType.editor.description"
    :icon="activeChartType.editor.icon"
    is-button
    @click="openDialog"
  />
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="showDialog"
        id="charts-type-picker"
        :title="$t('chartsTypePickerTitle', 'Choose a chart type')"
        :submit-label="$t('chartsTypePickerSubmit', 'Apply')"
        :width="1200"
        z-index="high"
        :can-submit="pendingType !== modelValue"
        @submit="onApply"
        @cancel="showDialog = false"
      >
        <TypeGrid v-model="pendingType" />
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli } from '#imports'
import type { ChartType, ChartTypeDefinition } from '../../../../types'
import { getChartTypes } from '../../../../chart-types'
import { BlokkliTransition, DialogModal } from '#blokkli/editor/components'
import PanelItem from '#blokkli/editor/components/Panel/Item/index.vue'
import { useDialog } from '#blokkli/editor/composables'
import TypeGrid from './TypeGrid.vue'

const props = defineProps<{
  modelValue: ChartType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ChartType]
}>()

const { $t, ui } = useBlokkli()

const chartTypes = computed<ChartTypeDefinition[]>(() => getChartTypes($t))

const showDialog = useDialog('charts-type-picker', 'center', 'high')

const activeChartType = computed<ChartTypeDefinition>(() => {
  return (
    chartTypes.value.find((v) => v.id === props.modelValue) ||
    chartTypes.value[0]!
  )
})

const pendingType = ref<ChartType>(props.modelValue)

function openDialog() {
  pendingType.value = props.modelValue
  showDialog.value = true
}

function onApply() {
  if (pendingType.value !== props.modelValue) {
    emit('update:modelValue', pendingType.value)
  }
  showDialog.value = false
}
</script>
