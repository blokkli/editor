<template>
  <VChart
    :option="option"
    autoresize
    style="width: 100%; height: var(--bk-chart-height, 550px)"
  />
</template>

<script setup lang="ts">
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

/**
 * The single `<VChart>` host shared by every built-in chart type. Owns the
 * vue-echarts element and its sizing so the type components carry only data.
 *
 * Height is a CSS custom property so integrators can size charts from userland
 * without touching the module: set `--bk-chart-height` globally (`:root`) or on
 * any ancestor of a chart. Width fills the container (vue-echarts' own stylesheet
 * already sets the element to 100%).
 */
defineProps<{ option: EChartsOption }>()
</script>
